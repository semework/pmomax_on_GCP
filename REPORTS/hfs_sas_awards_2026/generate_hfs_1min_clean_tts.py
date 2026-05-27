#!/usr/bin/env python3
import base64
import json
import re
import subprocess
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "REPORTS" / "hfs_sas_awards_2026"
TMP_DIR = REPORT_DIR / "hfs_1min_clean_tts_tmp"

PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000
VOICE_NAME = "en-US-Chirp3-HD-Orus"

INPUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_review_original_audio_backup.mp4"
FALLBACK_INPUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_review.mp4"

OUT_MP3 = REPORT_DIR / "pmomax_hfs_1min_voice.mp3"
OUT_WAV = REPORT_DIR / "pmomax_hfs_1min_voice.wav"
OUT_SRT = REPORT_DIR / "pmomax_hfs_1min_subtitles.srt"
OUT_TTS_SCRIPT = REPORT_DIR / "pmomax_hfs_1min_spoken_script_tts_only.txt"
OUT_TIMED_SCRIPT = REPORT_DIR / "pmomax_hfs_1min_timed_script.txt"
OUT_MANIFEST = REPORT_DIR / "pmomax_hfs_1min_manifest.json"
OUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_video.mp4"
OUT_REPORT = REPORT_DIR / "PMOMAX_HFS_1MIN_AUDIO_REPORT.md"

TTS_TEXT = """Project initiation usually starts fragmented, P M O Max brings it into one structured workspace

Teams can paste, upload, load a complete demo, or begin from a guided blank start

From raw project material, P M O Max produces a complete, editable project initiation document

Project information and context are normalized for decision-ready review

Objectives and key performance indicators stay measurable, visible, and consistent

Scope, deliverables, constraints, and dependencies remain explicit from the start

The entire initiation package stays aligned in one shared system

Planning becomes executable when schedules turn into a live Gantt chart

Milestones, sequencing, and delivery timing become visible at a glance

Execution detail stays connected to the initiation document that produced it"""

TTS_LINES = [line for line in TTS_TEXT.splitlines() if line.strip()]

SRT_TEXT = """1
00:00:00,000 --> 00:00:06,000
Project initiation usually starts fragmented. P M O Max brings it into one structured workspace.

2
00:00:06,000 --> 00:00:12,000
Teams can paste, upload, load a complete demo, or begin from a guided blank start.

3
00:00:12,000 --> 00:00:18,000
From raw project material, P M O Max produces a complete, editable project initiation document.

4
00:00:18,000 --> 00:00:24,000
Project information and context are normalized for decision-ready review.

5
00:00:24,000 --> 00:00:30,000
Objectives and key performance indicators stay measurable, visible, and consistent.

6
00:00:30,000 --> 00:00:36,000
Scope, deliverables, constraints, and dependencies remain explicit from the start.

7
00:00:36,000 --> 00:00:42,000
The entire initiation package stays aligned in one shared system.

8
00:00:42,000 --> 00:00:48,000
Planning becomes executable when schedules turn into a live Gantt chart.

9
00:00:48,000 --> 00:00:54,000
Milestones, sequencing, and delivery timing become visible at a glance.

10
00:00:54,000 --> 00:01:00,000
Execution detail stays connected to the initiation document that produced it.
"""

TIMED_SCRIPT = SRT_TEXT

FORBIDDEN_SUBSTRINGS = [
    ".", ":", ";", "PMOMax", "P.M.O", "Pimo", "Orus", "Image", "Focus",
    "Crop", "0:00", "00:", "-->", ".png", ".mp3", ".mp4", ".wav", ".srt",
    "http", "https", "/", "_", "|", "#", "*", "`", "[",
    "P.M.O. Max", "PeeEmOh", "PeeMOh",
]


def run(cmd: list[str], capture_output: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, text=True, capture_output=capture_output)


def ffmpeg_cmd(*args: str) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", *args]


def ffprobe_duration(path: Path) -> float:
    result = run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        capture_output=True,
    )
    return float(result.stdout.strip())


def ffprobe_audio_stream(path: Path) -> dict:
    result = run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=sample_rate,channels,codec_name",
            "-of", "json", str(path),
        ],
        capture_output=True,
    )
    streams = json.loads(result.stdout).get("streams", [])
    if not streams:
        raise RuntimeError(f"No audio stream found in {path}")
    return streams[0]


def volumedetect(path: Path) -> dict:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        check=True,
        text=True,
        capture_output=True,
    )
    text = result.stderr
    mean = re.search(r"mean_volume:\s*(-?\d+(?:\.\d+)?) dB", text)
    maxv = re.search(r"max_volume:\s*(-?\d+(?:\.\d+)?) dB", text)
    if not mean or not maxv:
        raise RuntimeError("Could not parse volumedetect output")
    return {"mean_db": float(mean.group(1)), "peak_db": float(maxv.group(1))}


def validate_tts_text(text: str) -> list[str]:
    failures = []
    for token in FORBIDDEN_SUBSTRINGS:
        if token in text:
            failures.append(token)
    if re.search(r"\bdot\b", text, flags=re.IGNORECASE):
        failures.append("word:dot")
    if "P M O Max" not in text:
        failures.append("missing P M O Max")
    if "PMOMax" in text:
        failures.append("contains PMOMax")
    if re.search(r"\b(KPI|KPIs|AI|PDF|JSON)\b", text):
        failures.append("contains forbidden abbreviation")
    return failures


def get_token() -> str:
    return run(["gcloud", "auth", "print-access-token"], capture_output=True).stdout.strip()


def synthesize_text(token: str, text: str, out_path: Path, speaking_rate: float) -> None:
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "en-US", "name": VOICE_NAME},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": speaking_rate,
            "volumeGainDb": -1.0,
        },
    }
    response_path = TMP_DIR / f"tts_response_{speaking_rate:.2f}.json"
    run(
        [
            "curl", "-sS",
            "-H", f"Authorization: Bearer {token}",
            "-H", f"x-goog-user-project: {PROJECT}",
            "-H", "Content-Type: application/json",
            API_URL,
            "-d", json.dumps(payload),
            "-o", str(response_path),
        ]
    )
    response = json.loads(response_path.read_text(encoding="utf-8"))
    if "audioContent" not in response:
        raise RuntimeError(json.dumps(response, indent=2))
    out_path.write_bytes(base64.b64decode(response["audioContent"]))


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


def clean_audio(raw: Path, cleaned: Path) -> None:
    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw),
            "-af",
            "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB:"
            "start_silence=0.01,"
            "highpass=f=65,lowpass=f=16000,"
            "acompressor=threshold=-21dB:ratio=1.7:attack=20:release=160:makeup=1.0,"
            "loudnorm=I=-18:LRA=7:TP=-2",
            "-ar", str(SAMPLE_RATE), "-ac", "1", str(cleaned),
        )
    )


def synthesize_line(token: str, text: str, out_path: Path, speaking_rate: float) -> None:
    failures = validate_tts_text(text)
    missing_only = failures == ["missing P M O Max"]
    if failures and not missing_only:
        raise RuntimeError(f"Line TTS validation failed: {failures}")
    synthesize_text(token, text, out_path, speaking_rate)


def read_wav_mono(path: Path) -> bytes:
    with wave.open(str(path), "rb") as wav:
        if wav.getframerate() != SAMPLE_RATE or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise RuntimeError(f"Unexpected WAV format for {path}")
        return wav.readframes(wav.getnframes())


def write_wav_mono(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)


def assemble_cue_spaced_audio(token: str, speaking_rate: float, out_path: Path) -> dict:
    raw_dir = TMP_DIR / f"cue_raw_{speaking_rate:.2f}"
    clean_dir = TMP_DIR / f"cue_clean_{speaking_rate:.2f}"
    raw_dir.mkdir(parents=True, exist_ok=True)
    clean_dir.mkdir(parents=True, exist_ok=True)

    total_samples = SAMPLE_RATE * 60
    mix = bytearray(total_samples * 2)
    line_info = []
    for idx, line in enumerate(TTS_LINES):
        cleaned = None
        duration = None
        used_rate = None
        for rate in [speaking_rate, 1.05, 1.10, 1.15]:
            raw = raw_dir / f"cue_{idx + 1:02d}_{rate:.2f}.wav"
            candidate = clean_dir / f"cue_{idx + 1:02d}_{rate:.2f}.wav"
            synthesize_line(token, line, raw, rate)
            clean_audio(raw, candidate)
            candidate_duration = ffprobe_duration(candidate)
            if candidate_duration <= 5.82:
                cleaned = candidate
                duration = candidate_duration
                used_rate = rate
                break
        if cleaned is None or duration is None or used_rate is None:
            raise RuntimeError(f"Cue {idx + 1} is too long for a 6s slot at tested normal rates")
        if duration > 5.82:
            raise RuntimeError(f"Cue {idx + 1} is too long at {duration:.3f}s for a 6s slot")
        pcm = read_wav_mono(cleaned)
        start = idx * 6 * SAMPLE_RATE * 2
        end = min(len(mix), start + len(pcm))
        mix[start:end] = pcm[: end - start]
        line_info.append({
            "cue": idx + 1,
            "speaking_rate": used_rate,
            "duration_sec": round(duration, 3),
            "remaining_pause_sec": round(6.0 - duration, 3),
        })

    write_wav_mono(out_path, bytes(mix))
    normalized = TMP_DIR / f"cue_spaced_normalized_{speaking_rate:.2f}.wav"
    run(
        ffmpeg_cmd(
            "-y", "-i", str(out_path),
            "-af", "highpass=f=65,lowpass=f=16000,"
            "acompressor=threshold=-21dB:ratio=1.7:attack=20:release=160:makeup=1.0,"
            "loudnorm=I=-18:LRA=7:TP=-2",
            "-ar", str(SAMPLE_RATE), "-ac", "1", str(normalized),
        )
    )
    normalized.replace(out_path)
    return {"mode": "cue-spaced normal cadence", "cue_info": line_info}


def validate_srt(text: str) -> None:
    blocks = [block.strip() for block in text.strip().split("\n\n") if block.strip()]
    if len(blocks) != 10:
        raise RuntimeError(f"SRT cue count is {len(blocks)}, expected 10")
    expected = [
        ("00:00:00,000", "00:00:06,000"),
        ("00:00:06,000", "00:00:12,000"),
        ("00:00:12,000", "00:00:18,000"),
        ("00:00:18,000", "00:00:24,000"),
        ("00:00:24,000", "00:00:30,000"),
        ("00:00:30,000", "00:00:36,000"),
        ("00:00:36,000", "00:00:42,000"),
        ("00:00:42,000", "00:00:48,000"),
        ("00:00:48,000", "00:00:54,000"),
        ("00:00:54,000", "00:01:00,000"),
    ]
    for idx, (block, (start, end)) in enumerate(zip(blocks, expected), start=1):
        lines = block.splitlines()
        if lines[0] != str(idx):
            raise RuntimeError(f"SRT cue {idx} has wrong index")
        if lines[1] != f"{start} --> {end}":
            raise RuntimeError(f"SRT cue {idx} has wrong timing: {lines[1]}")


def build_video(audio_path: Path) -> float | None:
    video_source = INPUT_VIDEO if INPUT_VIDEO.exists() else FALLBACK_INPUT_VIDEO
    if not video_source.exists():
        return None
    run(
        ffmpeg_cmd(
            "-y", "-i", str(video_source), "-i", str(audio_path),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-ar", str(SAMPLE_RATE), "-t", "60", str(OUT_VIDEO),
        )
    )
    return ffprobe_duration(OUT_VIDEO)


def write_report(manifest: dict) -> None:
    report = f"""# PMOMax HFS One-Minute Audio Report

## Exact TTS Input Used

```text
{TTS_TEXT}
```

## Results

- Voice used: `{manifest["voice_used"]}`
- Speaking rate used: `{manifest["speaking_rate_used"]}`
- Final MP3 duration: `{manifest["final_mp3_duration_sec"]:.3f}` seconds
- Orus used: `{str(manifest["orus_used"]).lower()}`
- Fallback voice used: `{str(manifest["fallback_voice_used"]).lower()}`
- Forbidden token scan result: `{manifest["forbidden_token_scan"]}`
- Pronunciation guardrail result: `{manifest["pronunciation_guardrail"]}`
- SRT validation result: `{manifest["srt_validation"]}`
- Audio level validation: `{manifest["audio_level_validation"]}`
- MP4 duration: `{manifest.get("final_video_duration_sec")}`

## Files Created

- `{OUT_MP3.name}`
- `{OUT_WAV.name}`
- `{OUT_SRT.name}`
- `{OUT_TTS_SCRIPT.name}`
- `{OUT_TIMED_SCRIPT.name}`
- `{OUT_MANIFEST.name}`
- `{OUT_VIDEO.name}`
"""
    OUT_REPORT.write_text(report, encoding="utf-8")


def main() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    print("Exact TTS input:")
    print("-----BEGIN TTS INPUT-----")
    print(TTS_TEXT)
    print("-----END TTS INPUT-----")

    failures = validate_tts_text(TTS_TEXT)
    if failures:
        raise RuntimeError(f"TTS input validation failed: {failures}")

    validate_srt(SRT_TEXT)
    OUT_TTS_SCRIPT.write_text(TTS_TEXT + "\n", encoding="utf-8")
    OUT_TIMED_SCRIPT.write_text(TIMED_SCRIPT, encoding="utf-8")
    OUT_SRT.write_text(SRT_TEXT, encoding="utf-8")

    token = get_token()
    selected_rate = 1.00
    assembly = assemble_cue_spaced_audio(token, selected_rate, OUT_WAV)
    selected_info = {
        "speaking_rate": selected_rate,
        "cleaned_duration": ffprobe_duration(OUT_WAV),
        "final_duration": ffprobe_duration(OUT_WAV),
        "tempo_factor": None,
        **assembly,
    }
    run(
        ffmpeg_cmd(
            "-y", "-i", str(OUT_WAV),
            "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", str(SAMPLE_RATE), "-ac", "1", str(OUT_MP3),
        )
    )

    mp3_duration = ffprobe_duration(OUT_MP3)
    if not (59.5 <= mp3_duration <= 60.5):
        raise RuntimeError(f"Final MP3 duration outside range: {mp3_duration:.3f}")

    levels = volumedetect(OUT_WAV)
    if levels["peak_db"] < -20 or levels["mean_db"] < -45:
        raise RuntimeError(f"Audio appears too quiet: {levels}")

    stream = ffprobe_audio_stream(OUT_MP3)
    if int(stream["sample_rate"]) != SAMPLE_RATE:
        raise RuntimeError(f"Unexpected sample rate: {stream}")
    if int(stream["channels"]) < 1:
        raise RuntimeError(f"Unexpected channel count: {stream}")

    video_duration = build_video(OUT_WAV)

    manifest = {
        "project": "PMOMax HFS one-minute video",
        "voice_used": VOICE_NAME,
        "speaking_rate_used": selected_info["speaking_rate"],
        "cleaned_duration_sec": round(selected_info["cleaned_duration"], 3),
        "tempo_factor": selected_info["tempo_factor"],
        "generation_mode": selected_info["mode"],
        "cue_info": selected_info["cue_info"],
        "final_mp3_duration_sec": round(mp3_duration, 3),
        "final_wav_duration_sec": round(ffprobe_duration(OUT_WAV), 3),
        "final_video_duration_sec": round(video_duration, 3) if video_duration is not None else None,
        "orus_used": True,
        "fallback_voice_used": False,
        "forbidden_token_scan": "passed",
        "pronunciation_guardrail": "passed",
        "srt_validation": "passed",
        "audio_level_validation": {
            "status": "passed",
            "mean_db": levels["mean_db"],
            "peak_db": levels["peak_db"],
            "stream": stream,
        },
        "files_created": [
            str(OUT_MP3.relative_to(REPORT_DIR)),
            str(OUT_WAV.relative_to(REPORT_DIR)),
            str(OUT_SRT.relative_to(REPORT_DIR)),
            str(OUT_TTS_SCRIPT.relative_to(REPORT_DIR)),
            str(OUT_TIMED_SCRIPT.relative_to(REPORT_DIR)),
            str(OUT_MANIFEST.relative_to(REPORT_DIR)),
            str(OUT_VIDEO.relative_to(REPORT_DIR)),
            str(OUT_REPORT.relative_to(REPORT_DIR)),
        ],
        "tts_input": TTS_TEXT,
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    write_report(manifest)

    print(json.dumps({
        "final_mp3_duration": round(mp3_duration, 3),
        "speaking_rate_used": selected_info["speaking_rate"],
        "voice_used": VOICE_NAME,
        "forbidden_token_scan": "passed",
        "srt_validation": "passed",
        "video_duration": manifest["final_video_duration_sec"],
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
