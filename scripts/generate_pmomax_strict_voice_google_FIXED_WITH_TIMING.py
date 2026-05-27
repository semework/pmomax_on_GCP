#!/usr/bin/env python3
import base64
import json
import os
import re
import subprocess
import sys
import wave
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "PMOMAX_MARKETPLACE_COST_REVIEW_20260512"
REPORT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
SCRIPT_SOURCE = REVIEW_DIR / "pmomax_3min_timed_script_FIXED.txt"
OUT_DIR = REPORT_DIR / "strict_voice_google_fixed_with_timing"
TMP_DIR = OUT_DIR / "tmp"
PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000
TOTAL_DURATION_SEC = 180.0
SEGMENT_AUDIO_LIMIT_SEC = 5.94

FINAL_WAV = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING.wav"
FINAL_MP3 = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING.mp3"
FINAL_SCRIPT = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING_spoken_script.txt"
FINAL_MANIFEST = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING_manifest.json"

VOICE = {
    "name": "en-US-Chirp3-HD-Leda",
    "speaking_rate": 1.25,
    "gain_db": -1.0,
}


@dataclass(frozen=True)
class Segment:
    index: int
    start: float
    end: float
    source_text: str
    spoken_text: str


def run(cmd: list[str], capture_output: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=capture_output, text=True)


def ffmpeg_cmd(*args: str) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", *args]


def ffprobe_duration(path: Path) -> float:
    result = run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path)
        ],
        capture_output=True,
    )
    return float(result.stdout.strip())


def get_token() -> str:
    env = os.environ.copy()
    env["CLOUDSDK_CORE_DISABLE_FILE_LOGGING"] = "true"
    result = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "gcloud auth print-access-token failed: "
            f"stdout={result.stdout.strip()!r} stderr={result.stderr.strip()!r}"
        )
    return result.stdout.strip()


def ensure_dirs() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)


def parse_timestamp(value: str) -> float:
    return float(value)


def clean_for_tts(text: str) -> str:
    cleaned = text.strip()
    cleaned = cleaned.replace("PDF", "P D F")
    cleaned = cleaned.replace("artificial-intelligence-enabled", "artificial intelligence enabled")
    cleaned = cleaned.replace("Built-in", "Built in")
    cleaned = cleaned.replace("section-aware", "section aware")
    cleaned = cleaned.replace("end-to-end", "end to end")
    cleaned = cleaned.replace(".", "")
    cleaned = cleaned.replace(";", ",")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def load_segments() -> list[Segment]:
    raw = SCRIPT_SOURCE.read_text(encoding="utf-8").strip()
    blocks = [block.strip() for block in re.split(r"\n\s*\n", raw) if block.strip()]
    segments: list[Segment] = []
    for idx, block in enumerate(blocks, start=1):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            raise RuntimeError(f"Bad timed block {idx}: {block!r}")
        match = re.fullmatch(r"(\d+\.\d{3})-(\d+\.\d{3})", lines[0])
        if not match:
            raise RuntimeError(f"Bad timestamp at block {idx}: {lines[0]!r}")
        source_text = " ".join(lines[1:])
        spoken_text = clean_for_tts(source_text)
        if idx == 27:
            spoken_text = "P M O Max supports Word, P D F exports, data files, and packaged deliverables"
        segments.append(
            Segment(
                index=idx,
                start=parse_timestamp(match.group(1)),
                end=parse_timestamp(match.group(2)),
                source_text=source_text,
                spoken_text=spoken_text,
            )
        )
    return segments


def validate_segments(segments: list[Segment]) -> None:
    if len(segments) != 30:
        raise RuntimeError(f"Expected 30 timed segments, found {len(segments)}")

    forbidden = [".", "PMOMax", "JSON", "PDF", "AI", "Jason", "156.000", "162.000", "<", ">"]
    for segment in segments:
        found = [item for item in forbidden if item in segment.spoken_text]
        if found:
            raise RuntimeError(f"Forbidden spoken text tokens in segment {segment.index}: {found}")
        expected_start = (segment.index - 1) * 6.0
        expected_end = segment.index * 6.0
        if abs(segment.start - expected_start) > 0.001 or abs(segment.end - expected_end) > 0.001:
            raise RuntimeError(
                f"Unexpected timing for segment {segment.index}: "
                f"{segment.start:.3f}-{segment.end:.3f}"
            )


def synthesize(token: str, text: str, out_path: Path) -> None:
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "en-US", "name": VOICE["name"]},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": VOICE["speaking_rate"],
            "volumeGainDb": VOICE["gain_db"],
        },
    }
    resp_path = TMP_DIR / "fixed_timing_response.json"
    run(
        [
            "curl", "-sS",
            "-H", f"Authorization: Bearer {token}",
            "-H", f"x-goog-user-project: {PROJECT}",
            "-H", "Content-Type: application/json",
            API_URL,
            "-d", json.dumps(payload),
            "-o", str(resp_path),
        ]
    )
    response = json.loads(resp_path.read_text(encoding="utf-8"))
    if "audioContent" not in response:
        raise RuntimeError(json.dumps(response))
    out_path.write_bytes(base64.b64decode(response["audioContent"]))


def fit_segment(raw_path: Path, fitted_path: Path, max_duration: float = SEGMENT_AUDIO_LIMIT_SEC) -> dict:
    raw_duration = ffprobe_duration(raw_path)
    if raw_duration <= max_duration:
        run(
            ffmpeg_cmd(
                "-y", "-i", str(raw_path),
                "-af", f"afade=t=out:st={max(raw_duration - 0.08, 0):.3f}:d=0.08",
                "-ar", str(SAMPLE_RATE), str(fitted_path)
            )
        )
        return {"raw_duration_sec": round(raw_duration, 3), "fit_speed": 1.0}

    speed = raw_duration / max_duration
    if speed > 1.22:
        raise RuntimeError(
            f"{raw_path.name} is {raw_duration:.3f}s and would need {speed:.3f}x speed. "
            "Shorten that line or increase base speaking_rate instead of making it rushed."
        )

    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw_path),
            "-af", (
                f"atempo={speed:.6f},"
                f"atrim=0:{max_duration:.3f},"
                f"afade=t=out:st={max_duration - 0.08:.3f}:d=0.08"
            ),
            "-ar", str(SAMPLE_RATE), str(fitted_path)
        )
    )
    return {"raw_duration_sec": round(raw_duration, 3), "fit_speed": round(speed, 4)}


def overlay_segment(canvas: bytearray, segment_path: Path, start_sec: float) -> None:
    start_frame = int(round(start_sec * SAMPLE_RATE))
    start_byte = start_frame * 2
    with wave.open(str(segment_path), "rb") as wf:
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != SAMPLE_RATE:
            raise RuntimeError(f"Unexpected WAV format for {segment_path}")
        data = wf.readframes(wf.getnframes())
    end_byte = start_byte + len(data)
    if end_byte > len(canvas):
        raise RuntimeError(f"{segment_path.name} exceeds final 180-second canvas")
    canvas[start_byte:end_byte] = data


def assemble_timed_wav(segments: list[Segment], fitted_paths: list[Path], out_path: Path) -> None:
    total_frames = int(round(TOTAL_DURATION_SEC * SAMPLE_RATE))
    canvas = bytearray(b"\x00\x00" * total_frames)
    for segment, fitted_path in zip(segments, fitted_paths):
        overlay_segment(canvas, fitted_path, segment.start)

    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(canvas))


def main() -> None:
    ensure_dirs()
    segments = load_segments()
    validate_segments(segments)
    FINAL_SCRIPT.write_text("\n\n".join(segment.spoken_text for segment in segments) + "\n", encoding="utf-8")

    token = get_token()
    fitted_paths: list[Path] = []
    segment_manifest = []
    for segment in segments:
        raw_path = OUT_DIR / f"fixed_timing_raw_{segment.index:02d}.wav"
        fitted_path = OUT_DIR / f"fixed_timing_fitted_{segment.index:02d}.wav"
        synthesize(token, segment.spoken_text, raw_path)
        fit_info = fit_segment(raw_path, fitted_path)
        fitted_duration = ffprobe_duration(fitted_path)
        fitted_paths.append(fitted_path)
        segment_manifest.append({
            "index": segment.index,
            "start_sec": segment.start,
            "end_sec": segment.end,
            "source_text": segment.source_text,
            "spoken_text": segment.spoken_text,
            **fit_info,
            "fitted_duration_sec": round(fitted_duration, 3),
        })

    raw_timed_wav = OUT_DIR / "fixed_timing_raw_timeline.wav"
    assemble_timed_wav(segments, fitted_paths, raw_timed_wav)

    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw_timed_wav),
            "-af", "highpass=f=60,lowpass=f=16500,acompressor=threshold=-20dB:ratio=1.6:attack=18:release=140:makeup=1.1,loudnorm=I=-18:LRA=6:TP=-2",
            "-ar", str(SAMPLE_RATE), str(FINAL_WAV)
        )
    )
    run(
        ffmpeg_cmd(
            "-y", "-i", str(FINAL_WAV),
            "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", str(SAMPLE_RATE), str(FINAL_MP3)
        )
    )

    manifest = {
        "source": str(SCRIPT_SOURCE.relative_to(ROOT)),
        "voice": VOICE,
        "duration_wav_sec": round(ffprobe_duration(FINAL_WAV), 3),
        "duration_mp3_sec": round(ffprobe_duration(FINAL_MP3), 3),
        "line_count": len(segments),
        "script": str(FINAL_SCRIPT.relative_to(ROOT)),
        "wav": str(FINAL_WAV.relative_to(ROOT)),
        "mp3": str(FINAL_MP3.relative_to(ROOT)),
        "notes": [
            "Audio only",
            "Source timestamps are used only for placement",
            "No timestamps are sent to Google TTS",
            "No full stops are sent to Google TTS",
            "Brand is read from the fixed source as P M O Max",
            "Segments are placed on the exact 6-second timeline",
            "Segments over the slot limit fail if they would need more than 1.18x speed",
        ],
        "segments": segment_manifest,
    }
    FINAL_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(FINAL_WAV)
    print(FINAL_MP3)
    print(FINAL_SCRIPT)
    print(FINAL_MANIFEST)
    print(f"duration_wav={manifest['duration_wav_sec']:.3f}")
    print(f"duration_mp3={manifest['duration_mp3_sec']:.3f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
