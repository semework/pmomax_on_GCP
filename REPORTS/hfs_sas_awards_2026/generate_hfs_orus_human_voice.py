#!/usr/bin/env python3
import base64
import html
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "REPORTS" / "hfs_sas_awards_2026"
OUT_DIR = REPORT_DIR / "hfs_orus_human_voice"
TMP_DIR = OUT_DIR / "tmp"
RAW_DIR = OUT_DIR / "raw_segments"
PROC_DIR = OUT_DIR / "processed_segments"

PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000

INPUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_review.mp4"
BACKUP_VIDEO = REPORT_DIR / "pmomax_hfs_1min_review_original_audio_backup.mp4"
FINAL_VIDEO = REPORT_DIR / "pmomax_hfs_1min_review.mp4"
FINAL_WAV = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_voice.wav"
FINAL_MP3 = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_voice.mp3"
FINAL_MANIFEST = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_voice_manifest.json"
FINAL_SPOKEN_SCRIPT = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_voice_spoken_script.txt"

VOICE = {
    "name": "en-US-Chirp3-HD-Orus",
    "speaking_rate": 0.78,
    "gain_db": -1.0,
    "pitch": "-0.8st",
    "pause_ms": 120,
    "loudnorm": "I=-18:LRA=7:TP=-2",
}

SEGMENTS = [
    {
        "id": "01",
        "start": 0.0,
        "end": 6.0,
        "caption": "Project initiation usually starts fragmented. PMOMax brings it into one structured workspace.",
        "spoken": "Project initiation usually starts fragmented. P M O Max brings it into one structured workspace.",
    },
    {
        "id": "02",
        "start": 6.0,
        "end": 12.0,
        "caption": "Teams can paste, upload, load a complete demo, or begin from a guided blank start.",
        "spoken": "Teams can paste, upload, load a complete demo, or begin from a guided blank start.",
    },
    {
        "id": "03",
        "start": 12.0,
        "end": 18.0,
        "caption": "From raw project material, PMOMax produces a complete, editable PID.",
        "spoken": "From raw project material, P M O Max produces a complete, editable project initiation document.",
    },
    {
        "id": "04",
        "start": 18.0,
        "end": 24.0,
        "caption": "Project information and context are normalized immediately for decision-ready review.",
        "spoken": "Project information and context are normalized for decision-ready review.",
    },
    {
        "id": "05",
        "start": 24.0,
        "end": 30.0,
        "caption": "Objectives and KPIs stay measurable, visible, and consistent.",
        "spoken": "Objectives and key performance indicators stay measurable, visible, and consistent.",
    },
    {
        "id": "06",
        "start": 30.0,
        "end": 36.0,
        "caption": "Scope, deliverables, constraints, and dependencies remain explicit from the start.",
        "spoken": "Scope, deliverables, constraints, and dependencies remain explicit from the start.",
    },
    {
        "id": "07",
        "start": 36.0,
        "end": 42.0,
        "caption": "The entire initiation package stays aligned in one shared system.",
        "spoken": "The entire initiation package stays aligned in one shared system.",
    },
    {
        "id": "08",
        "start": 42.0,
        "end": 48.0,
        "caption": "Planning becomes executable when schedules turn into a live Gantt.",
        "spoken": "Planning becomes executable when schedules turn into a live Gantt chart.",
    },
    {
        "id": "09",
        "start": 48.0,
        "end": 54.0,
        "caption": "Milestones, sequencing, and delivery timing become visible at a glance.",
        "spoken": "Milestones, sequencing, and delivery timing become visible at a glance.",
    },
    {
        "id": "10",
        "start": 54.0,
        "end": 60.0,
        "caption": "Execution detail stays connected to the initiation document that produced it.",
        "spoken": "Execution detail stays connected to the initiation document that produced it.",
    },
]


def run(cmd, capture_output=False):
    return subprocess.run(cmd, check=True, capture_output=capture_output, text=True)


def ffmpeg_cmd(*args: str) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", *args]


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


def ssml_text(text: str) -> str:
    escaped = html.escape(text, quote=False)
    escaped = escaped.replace("P M O Max", '<say-as interpret-as="characters">PMO</say-as> Max')
    escaped = escaped.replace("Gantt chart", '<sub alias="gant chart">Gantt chart</sub>')
    escaped = escaped.replace("Gantt", '<sub alias="gant">Gantt</sub>')
    return escaped


def build_ssml(text: str) -> str:
    return (
        "<speak>"
        f'<prosody pitch="{VOICE["pitch"]}" volume="medium">{ssml_text(text)}</prosody>'
        f'<break time="{VOICE["pause_ms"]}ms"/>'
        "</speak>"
    )


def synthesize(token: str, text: str, out_path: Path, speaking_rate: float) -> None:
    payload = {
        "input": {"ssml": build_ssml(text)},
        "voice": {"languageCode": "en-US", "name": VOICE["name"]},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": speaking_rate,
            "volumeGainDb": VOICE["gain_db"],
        },
    }
    response_path = TMP_DIR / f"{out_path.stem}.json"
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
            str(response_path),
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


def process_segment(raw_path: Path, proc_path: Path, window: float) -> dict:
    cleaned_path = proc_path.with_name(f"{proc_path.stem}_clean.wav")
    fitted_path = proc_path.with_name(f"{proc_path.stem}_fit.wav")
    target_max = max(0.2, window - 0.25)

    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(raw_path),
            "-af",
            "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.02:stop_periods=0",
            "-ar",
            str(SAMPLE_RATE),
            str(cleaned_path),
        )
    )
    natural_duration = ffprobe_duration(cleaned_path)
    tempo_factor = 1.0
    if natural_duration > target_max:
        tempo_factor = natural_duration / target_max
        run(
            ffmpeg_cmd(
                "-y",
                "-i",
                str(cleaned_path),
                "-filter:a",
                atempo_chain(tempo_factor),
                "-ar",
                str(SAMPLE_RATE),
                str(fitted_path),
            )
        )
    else:
        run(ffmpeg_cmd("-y", "-i", str(cleaned_path), "-ar", str(SAMPLE_RATE), str(fitted_path)))

    fitted_duration = min(ffprobe_duration(fitted_path), target_max)
    fade_start = max(0.0, fitted_duration - 0.08)
    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(fitted_path),
            "-af",
            f"atrim=0:{target_max:.3f},asetpts=N/SR/TB,afade=t=out:st={fade_start:.3f}:d=0.06",
            "-ar",
            str(SAMPLE_RATE),
            str(proc_path),
        )
    )
    return {
        "natural_duration": round(natural_duration, 3),
        "processed_duration": round(ffprobe_duration(proc_path), 3),
        "tempo_factor": round(tempo_factor, 4),
    }


def assemble_audio() -> None:
    total_runtime = 60.0
    total_samples = int(round(total_runtime * SAMPLE_RATE))
    mix = np.zeros(total_samples, dtype=np.float32)

    for seg in SEGMENTS:
        seg_path = PROC_DIR / f"{seg['id']}.wav"
        with wave.open(str(seg_path), "rb") as wf:
            frames = wf.readframes(wf.getnframes())
        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        start_sample = int(round(seg["start"] * SAMPLE_RATE))
        end_sample = min(total_samples, start_sample + len(audio))
        mix[start_sample:end_sample] += audio[: end_sample - start_sample]

    peak = float(np.max(np.abs(mix))) if mix.size else 0.0
    if peak > 0.98:
        mix *= 0.98 / peak
    premix = OUT_DIR / "premix.wav"
    pcm = np.clip(mix * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(str(premix), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())

    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(premix),
            "-af",
            f"highpass=f=65,lowpass=f=16000,acompressor=threshold=-21dB:ratio=1.7:attack=20:release=160:makeup=1.0,loudnorm={VOICE['loudnorm']}",
            "-ar",
            str(SAMPLE_RATE),
            str(FINAL_WAV),
        )
    )
    run(ffmpeg_cmd("-y", "-i", str(FINAL_WAV), "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", str(SAMPLE_RATE), str(FINAL_MP3)))


def mux_video() -> None:
    source_video = BACKUP_VIDEO if BACKUP_VIDEO.exists() else INPUT_VIDEO
    temp_video = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_tmp.mp4"
    run(
        ffmpeg_cmd(
            "-y",
            "-i",
            str(source_video),
            "-i",
            str(FINAL_WAV),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            str(SAMPLE_RATE),
            "-shortest",
            str(temp_video),
        )
    )
    temp_video.replace(FINAL_VIDEO)


def ensure_dirs() -> None:
    for path in (OUT_DIR, TMP_DIR, RAW_DIR, PROC_DIR):
        path.mkdir(parents=True, exist_ok=True)


def main() -> None:
    ensure_dirs()
    if not INPUT_VIDEO.exists():
        raise RuntimeError(f"Missing input video: {INPUT_VIDEO}")
    if not BACKUP_VIDEO.exists():
        BACKUP_VIDEO.write_bytes(INPUT_VIDEO.read_bytes())

    token = get_token()
    manifest_segments = []
    for seg in SEGMENTS:
        raw_path = RAW_DIR / f"{seg['id']}.wav"
        proc_path = PROC_DIR / f"{seg['id']}.wav"
        synthesize(token, seg["spoken"], raw_path, VOICE["speaking_rate"])
        info = process_segment(raw_path, proc_path, seg["end"] - seg["start"])
        manifest_segments.append({**seg, **info})

    assemble_audio()
    mux_video()

    spoken_text = "\n".join(f'{seg["start"]:05.1f}-{seg["end"]:05.1f} {seg["spoken"]}' for seg in SEGMENTS)
    FINAL_SPOKEN_SCRIPT.write_text(spoken_text + "\n", encoding="utf-8")

    video_duration = ffprobe_duration(FINAL_VIDEO)
    audio_duration = ffprobe_duration(FINAL_WAV)
    manifest = {
        "voice": VOICE,
        "video": str(FINAL_VIDEO.relative_to(ROOT)),
        "backup_video": str(BACKUP_VIDEO.relative_to(ROOT)),
        "wav": str(FINAL_WAV.relative_to(ROOT)),
        "mp3": str(FINAL_MP3.relative_to(ROOT)),
        "video_duration_sec": round(video_duration, 3),
        "audio_duration_sec": round(audio_duration, 3),
        "segments": manifest_segments,
        "notes": [
            "Video stream copied unchanged from original",
            "Original video with old audio preserved as backup",
            "PMOMax spoken as P M O Max",
            "PID spoken as project initiation document",
            "KPIs spoken as key performance indicators",
            "Orus Chirp HD voice used for calmer executive narration",
        ],
    }
    FINAL_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if not (59.9 <= video_duration <= 60.1):
        raise RuntimeError(f"Final video duration is outside 60s target: {video_duration:.3f}")

    print(FINAL_VIDEO)
    print(FINAL_WAV)
    print(FINAL_MP3)
    print(FINAL_MANIFEST)
    print(f"final_video_duration={video_duration:.3f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
