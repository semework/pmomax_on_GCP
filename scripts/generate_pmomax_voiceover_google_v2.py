#!/usr/bin/env python3
import base64
import json
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
OUT_DIR = REPORT_DIR / "voiceover_versions_google_v2"
TMP_DIR = OUT_DIR / "tmp"
PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000
MASTER_MP3 = REPORT_DIR / "pmomax_promo_3min_voiceover.mp3"
MASTER_WAV = REPORT_DIR / "pmomax_promo_3min_voiceover.wav"
PRIMARY_MP3 = REPORT_DIR / "pmomax_promo_3min_marketing_narration.mp3"
PRIMARY_WAV = REPORT_DIR / "pmomax_promo_3min_marketing_narration.wav"
FINAL_SCRIPT_TXT = REPORT_DIR / "pmomax_promo_3min_marketing_narration_script.txt"
MASTER_NOTES = REPORT_DIR / "pmomax_promo_3min_voiceover_versions.txt"
MANIFEST_JSON = REPORT_DIR / "pmomax_promo_3min_voiceover_manifest.json"
SCRIPT_TXT = REPORT_DIR / "pmomax_promo_3min_script.txt"

VARIANTS = [
    {
        "slug": "marketing_final",
        "label": "Marketing final",
        "voice": "en-US-Chirp3-HD-Leda",
        "narrator_voices": {
            "Narrator A": "en-US-Chirp3-HD-Leda",
            "Narrator B": "en-US-Chirp3-HD-Zephyr",
            "Narrator C": "en-US-Chirp3-HD-Kore",
        },
        "rate": 0.97,
        "pitch": "-0.7st",
        "gain_db": -0.8,
        "pause_ms": 120,
        "loudnorm": "I=-18:LRA=6:TP=-2",
    },
]


def run(cmd, capture_output=False):
    return subprocess.run(cmd, check=True, capture_output=capture_output, text=True)


def ffmpeg_cmd(*args: str) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", *args]


def parse_timestamp(value: str) -> float:
    hh, mm, rest = value.split(":")
    return int(hh) * 3600 + int(mm) * 60 + float(rest)


def load_segments() -> list[dict]:
    pattern = re.compile(
        r"^(?P<start>\d{2}:\d{2}:\d{2}\.\d{3}) - "
        r"(?P<end>\d{2}:\d{2}:\d{2}\.\d{3}) \| "
        r"(?P<narrator>[^|]+) \| "
        r"(?P<image>[^|]+) \| "
        r"(?P<text>.+?) \| audio=(?P<audio>[0-9.]+)s$"
    )
    segments = []
    lines = SCRIPT_TXT.read_text(encoding="utf-8").splitlines()
    for line in lines:
        line = line.strip()
        if not line or not line.startswith("00:"):
            continue
        match = pattern.match(line)
        if not match:
            raise RuntimeError(f"Unparseable script line: {line}")
        data = match.groupdict()
        segments.append(
            {
                "id": f"{len(segments) + 1:02d}",
                "start": parse_timestamp(data["start"]),
                "end": parse_timestamp(data["end"]),
                "narrator": data["narrator"].strip(),
                "image": data["image"].strip(),
                "text": data["text"].strip(),
                "target_audio": float(data["audio"]),
            }
        )
    if not segments:
        raise RuntimeError(f"No timed segments found in {SCRIPT_TXT}")
    return segments


def ffprobe_duration(path: Path) -> float:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
    )
    return float(result.stdout.strip())


def get_token() -> str:
    return run(["gcloud", "auth", "print-access-token"], capture_output=True).stdout.strip()


def apply_pronunciation_markup(text: str) -> str:
    out = text
    replacements = [
        ("PMOMax", '<sub alias="Pee-Em-Oh-Max">PMOMax</sub>'),
        ("PID", '<say-as interpret-as="characters">PID</say-as>'),
        ("KPIs", '<sub alias="K P I s">KPIs</sub>'),
        ("KPI", '<say-as interpret-as="characters">KPI</say-as>'),
        ("PDF", '<say-as interpret-as="characters">PDF</say-as>'),
        ("PNG", '<say-as interpret-as="characters">PNG</say-as>'),
        ("SVG", '<say-as interpret-as="characters">SVG</say-as>'),
        ("JSON", '<sub alias="Jason">JSON</sub>'),
        ("JPEG", '<sub alias="jay-peg">JPEG</sub>'),
        ("AI-assisted", '<say-as interpret-as="characters">AI</say-as>-assisted'),
        ("AI assistant", '<say-as interpret-as="characters">AI</say-as> assistant'),
        ("AI", '<say-as interpret-as="characters">AI</say-as>'),
        ("Gantt", '<phoneme alphabet="ipa" ph="ɡænt">Gantt</phoneme>'),
    ]
    for old, new in replacements:
        out = out.replace(old, new)
    return out


def build_ssml(text: str, variant: dict, pause_ms: int | None = None) -> str:
    escaped = apply_pronunciation_markup(text)
    pause = int(variant["pause_ms"] if pause_ms is None else pause_ms)
    internal_pause = max(60, pause)
    return (
        "<speak>"
        "<p>"
        f'<s><prosody pitch="{variant["pitch"]}" volume="medium">{escaped}</prosody></s>'
        "</p>"
        f'<break time="{internal_pause}ms"/>'
        "</speak>"
    )


def synthesize_google(token: str, variant: dict, ssml_text: str, out_path: Path, speaking_rate: float | None = None):
    voice_name = variant.get("active_voice", variant["voice"])
    effective_rate = variant["rate"] if speaking_rate is None else speaking_rate
    payload = {
        "input": {"ssml": ssml_text},
        "voice": {"languageCode": "en-US", "name": voice_name},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": effective_rate,
            "volumeGainDb": variant["gain_db"],
        },
    }
    resp_path = TMP_DIR / f"{variant['slug']}_{out_path.stem}.json"
    run(
        [
            "curl",
            "-sS",
            "-H",
            f"Authorization: Bearer {token}",
            "-H",
            f"x-goog-user-project: {PROJECT}",
            "-H",
            "Content-Type: application/json",
            API_URL,
            "-d",
            json.dumps(payload),
            "-o",
            str(resp_path),
        ]
    )
    response = json.loads(resp_path.read_text(encoding="utf-8"))
    if "audioContent" not in response:
        if voice_name != variant["voice"]:
            fallback_payload = payload.copy()
            fallback_payload["voice"] = {"languageCode": "en-US", "name": variant["voice"]}
            run(
                [
                    "curl",
                    "-sS",
                    "-H",
                    f"Authorization: Bearer {token}",
                    "-H",
                    f"x-goog-user-project: {PROJECT}",
                    "-H",
                    "Content-Type: application/json",
                    API_URL,
                    "-d",
                    json.dumps(fallback_payload),
                    "-o",
                    str(resp_path),
                ]
            )
            response = json.loads(resp_path.read_text(encoding="utf-8"))
        if "audioContent" not in response:
            raise RuntimeError(json.dumps(response))
    out_path.write_bytes(base64.b64decode(response["audioContent"]))


def synthesize_best_fit(token: str, variant: dict, seg: dict, raw_path: Path) -> float:
    attempts = [
        (variant["rate"], variant["pause_ms"]),
        (min(1.04, variant["rate"] + 0.03), max(90, variant["pause_ms"] - 30)),
        (min(1.08, variant["rate"] + 0.06), max(70, variant["pause_ms"] - 60)),
        (min(1.12, variant["rate"] + 0.09), max(60, variant["pause_ms"] - 80)),
    ]
    best_duration = None
    best_audio = None
    for speaking_rate, pause_ms in attempts:
        synthesize_google(
            token,
            variant,
            build_ssml(seg["text"], variant, pause_ms=pause_ms),
            raw_path,
            speaking_rate=speaking_rate,
        )
        current_audio = raw_path.read_bytes()
        current_duration = ffprobe_duration(raw_path)
        if best_duration is None or abs(current_duration - seg["target_audio"]) < abs(best_duration - seg["target_audio"]):
            best_duration = current_duration
            best_audio = current_audio
        if current_duration <= seg["end"] - seg["start"] - 0.02:
            return current_duration
    if best_audio is not None:
        raw_path.write_bytes(best_audio)
        return float(best_duration)
    raise RuntimeError(f"Failed to synthesize segment {seg['id']}")


def atempo_chain(factor: float) -> str:
    parts = []
    remaining = factor
    while remaining > 2.0:
        parts.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        parts.append("atempo=0.5")
        remaining /= 0.5
    parts.append(f"atempo={remaining:.6f}")
    return ",".join(parts)


def tempo_filter(factor: float) -> str:
    if abs(factor - 1.0) < 0.01:
        return "anull"
    return atempo_chain(factor)


def ensure_dirs():
    for path in (REPORT_DIR, OUT_DIR, TMP_DIR):
        path.mkdir(parents=True, exist_ok=True)
    for variant in VARIANTS:
        (OUT_DIR / variant["slug"] / "raw_segments").mkdir(parents=True, exist_ok=True)
        (OUT_DIR / variant["slug"] / "processed_segments").mkdir(parents=True, exist_ok=True)


def validate_schedule(segments: list[dict]) -> None:
    for idx, seg in enumerate(segments, start=1):
        expected_id = f"{idx:02d}"
        if seg["id"] != expected_id:
            raise RuntimeError(f"Segment id mismatch: expected {expected_id}, got {seg['id']}")
        if seg["end"] <= seg["start"]:
            raise RuntimeError(f"Invalid segment timing for {seg['id']}")
        if idx > 1 and seg["start"] < segments[idx - 2]["start"]:
            raise RuntimeError(f"Non-monotonic start time at segment {seg['id']}")


def process_segment(raw_path: Path, proc_path: Path, window: float):
    cleaned_path = proc_path.with_name(f"{proc_path.stem}_clean.wav")
    fitted_path = proc_path.with_name(f"{proc_path.stem}_fit.wav")
    target_max = max(0.2, window - 0.18)
    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(raw_path),
            "-af",
            "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:"
            "start_silence=0.02:stop_periods=0",
            "-ar",
            str(SAMPLE_RATE),
            str(cleaned_path),
        )
    )

    raw_duration = ffprobe_duration(cleaned_path)
    if raw_duration < window * 0.35:
        run(["ffmpeg", "-y", "-i", str(raw_path), "-ar", str(SAMPLE_RATE), str(cleaned_path)])
        raw_duration = ffprobe_duration(cleaned_path)

    if raw_duration > target_max:
        factor = raw_duration / target_max
        filt = tempo_filter(factor)
        run(ffmpeg_cmd("-y", "-i", str(cleaned_path), "-filter:a", filt, "-ar", str(SAMPLE_RATE), str(fitted_path)))
    else:
        run(ffmpeg_cmd("-y", "-i", str(cleaned_path), "-ar", str(SAMPLE_RATE), str(fitted_path)))

    # Final guard: each segment must fit inside its schedule window. Otherwise
    # fixed-start assembly creates overlapping voices.
    fade_start = max(0.0, target_max - 0.06)
    run(
        ffmpeg_cmd(
            "-y", "-i", str(fitted_path),
            "-af", f"atrim=0:{target_max:.3f},asetpts=N/SR/TB,afade=t=out:st={fade_start:.3f}:d=0.05",
            "-ar", str(SAMPLE_RATE), str(proc_path)
        )
    )


def assemble_variant(variant: dict, segments: list[dict]):
    total_runtime = segments[-1]["end"] + 0.8
    proc_dir = OUT_DIR / variant["slug"] / "processed_segments"
    final_wav = OUT_DIR / f"pmomax_promo_3min_voiceover_{variant['slug']}.wav"
    final_mp3 = OUT_DIR / f"pmomax_promo_3min_voiceover_{variant['slug']}.mp3"
    premix_wav = OUT_DIR / f"pmomax_promo_3min_voiceover_{variant['slug']}_premix.wav"
    total_samples = int(round(total_runtime * SAMPLE_RATE))
    mix = np.zeros(total_samples, dtype=np.float32)

    for seg in segments:
        seg_wav = proc_dir / f"{seg['id']}.wav"
        with wave.open(str(seg_wav), "rb") as wf:
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != SAMPLE_RATE:
                raise RuntimeError(f"Unexpected WAV format for {seg_wav}")
            frames = wf.readframes(wf.getnframes())
        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        start_sample = int(round(seg["start"] * SAMPLE_RATE))
        window_samples = int(round((seg["end"] - seg["start"]) * SAMPLE_RATE))
        if len(audio) > window_samples:
            raise RuntimeError(
                f"Segment {seg['id']} is {len(audio) / SAMPLE_RATE:.3f}s, "
                f"longer than its {seg['end'] - seg['start']:.3f}s window"
            )
        end_sample = min(total_samples, start_sample + len(audio))
        if end_sample > start_sample:
            mix[start_sample:end_sample] += audio[: end_sample - start_sample]

    peak = float(np.max(np.abs(mix))) if mix.size else 0.0
    if peak > 0.98:
        mix *= 0.98 / peak

    pcm = np.clip(mix * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(str(premix_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())

    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(premix_wav),
            "-af",
            f"highpass=f=60,lowpass=f=16500,acompressor=threshold=-20dB:ratio=1.8:attack=18:release=140:makeup=1.2,loudnorm={variant['loudnorm']}",
            "-ar",
            str(SAMPLE_RATE),
            str(final_wav),
        )
    )
    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(final_wav),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "192k",
            "-ar",
            str(SAMPLE_RATE),
            str(final_mp3),
        )
    )
    return final_mp3, final_wav


def main():
    ensure_dirs()
    token = get_token()
    segments = load_segments()
    validate_schedule(segments)
    manifest = []

    for variant in VARIANTS:
        raw_dir = OUT_DIR / variant["slug"] / "raw_segments"
        proc_dir = OUT_DIR / variant["slug"] / "processed_segments"
        lines = []
        for seg in segments:
            raw_path = raw_dir / f"{seg['id']}.wav"
            proc_path = proc_dir / f"{seg['id']}.wav"
            variant["active_voice"] = variant.get("narrator_voices", {}).get(seg.get("narrator"), variant["voice"])
            synthesize_best_fit(token, variant, seg, raw_path)
            process_segment(raw_path, proc_path, seg["end"] - seg["start"])
            lines.append(
                {
                    "id": seg["id"],
                    "start": seg["start"],
                    "end": seg["end"],
                    "narrator": seg.get("narrator"),
                    "voice_used": variant["active_voice"],
                    "text": seg["text"],
                    "processed_duration": round(ffprobe_duration(proc_path), 3),
                }
            )
        final_mp3, final_wav = assemble_variant(variant, segments)
        manifest.append(
            {
                "slug": variant["slug"],
                "label": variant["label"],
                "voice": variant["voice"],
                "narrator_voices": variant.get("narrator_voices", {}),
                "rate": variant["rate"],
                "pitch": variant["pitch"],
                "gain_db": variant["gain_db"],
                "mp3": str(final_mp3.relative_to(ROOT)),
                "wav": str(final_wav.relative_to(ROOT)),
                "duration_sec": round(ffprobe_duration(final_mp3), 3),
                "segments": lines,
            }
        )

    preferred = OUT_DIR / "pmomax_promo_3min_voiceover_marketing_final.mp3"
    preferred_wav = OUT_DIR / "pmomax_promo_3min_voiceover_marketing_final.wav"
    shutil.copy2(preferred, MASTER_MP3)
    shutil.copy2(preferred_wav, MASTER_WAV)
    shutil.copy2(preferred, PRIMARY_MP3)
    shutil.copy2(preferred_wav, PRIMARY_WAV)
    FINAL_SCRIPT_TXT.write_text(
        "\n\n".join(f"{seg['start']:07.3f}-{seg['end']:07.3f} | {seg['narrator']}\n{seg['text']}" for seg in segments) + "\n",
        encoding="utf-8",
    )

    notes = [
        "PMOMax promo 3-minute Google TTS variants",
        "Preferred master copied to:",
        f"- {MASTER_MP3.relative_to(ROOT)}",
        f"- {MASTER_WAV.relative_to(ROOT)}",
        f"- {PRIMARY_MP3.relative_to(ROOT)}",
        f"- {PRIMARY_WAV.relative_to(ROOT)}",
        "",
    ]
    for item in manifest:
        notes.extend(
            [
                f"{item['slug']}: {item['label']}",
                f"  voice={item['voice']} rate={item['rate']} pitch={item['pitch']} gain_db={item['gain_db']}",
                f"  mp3={item['mp3']}",
                f"  wav={item['wav']}",
                f"  duration_sec={item['duration_sec']}",
                "",
            ]
        )
    MASTER_NOTES.write_text("\n".join(notes).rstrip() + "\n", encoding="utf-8")
    MANIFEST_JSON.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    master_mp3_duration = ffprobe_duration(PRIMARY_MP3)
    master_wav_duration = ffprobe_duration(PRIMARY_WAV)
    if not PRIMARY_MP3.exists() or not PRIMARY_WAV.exists() or not MANIFEST_JSON.exists():
        raise RuntimeError("Expected output files are missing")

    print(MASTER_MP3)
    print(MASTER_WAV)
    print(PRIMARY_MP3)
    print(PRIMARY_WAV)
    print(FINAL_SCRIPT_TXT)
    print(MASTER_NOTES)
    print(MANIFEST_JSON)
    print(f"duration_mp3={master_mp3_duration:.3f}")
    print(f"duration_wav={master_wav_duration:.3f}")
    print(f"segments_verified={len(segments)}")
    print("segment_starts_verified=true")
    print("files_exist_verified=true")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
