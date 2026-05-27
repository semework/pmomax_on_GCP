#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables" / "pmomax_voiceover"
RAW_DIR = OUT_DIR / "raw_segments"
PROC_DIR = OUT_DIR / "processed_segments"

API_URL = "https://api.openai.com/v1/audio/speech"
MODEL = "gpt-4o-mini-tts"
VOICE = "marin"
LOCAL_VOICE = "Flo (English (US))"
LOCAL_RATE = "158"
SAMPLE_RATE = 48000
FINAL_NAME = "pmomax_product_voiceover_final_48k.mp3"
FINAL_WAV_NAME = "pmomax_product_voiceover_final_48k.wav"
SCRIPT_NAME = "pmomax_product_voiceover_spoken_script.txt"

INSTRUCTIONS = (
    "US English female professional narrator for a premium B2B enterprise software launch video. "
    "Calm, polished, confident, warm, and trustworthy. Medium-slow pace. Clear diction. "
    "Slightly cinematic but restrained. No sales hype, no cartoon energy, no exaggerated enthusiasm. "
    "Use smooth phrasing and deliberate pauses. "
    "Subtle emphasis on: projects fail long before delivery begins, weak initiation, P M O Max structures them instantly, "
    "complete P I D, governance and compliance, assistant, planning becomes executable, Gantt chart seamlessly embedded, "
    "start projects correctly every time."
)

SEGMENTS = [
    {
        "id": "01",
        "start": 2.1,
        "end": 9.0,
        "display": "projects fail long before delivery begins",
        "spoken": "Projects fail long before delivery begins.",
    },
    {
        "id": "02",
        "start": 10.5,
        "end": 13.3,
        "display": "the cause is almost always weak initiation",
        "spoken": "The cause is almost always weak initiation.",
    },
    {
        "id": "03",
        "start": 17.2,
        "end": 21.8,
        "display": "start with raw inputs",
        "spoken": "Start with raw inputs.",
    },
    {
        "id": "04",
        "start": 26.2,
        "end": 28.8,
        "display": "PMOMax structures them instantly",
        "spoken": "P. M. O. Max structures them instantly.",
    },
    {
        "id": "05",
        "start": 34.4,
        "end": 36.8,
        "display": "you get a complete PID",
        "spoken": "You get a complete P. I. D.",
    },
    {
        "id": "06",
        "start": 42.0,
        "end": 46.3,
        "display": "governance and compliance are built in",
        "spoken": "Governance and compliance are built in.",
    },
    {
        "id": "07",
        "start": 49.5,
        "end": 52.8,
        "display": "risks stay visible and actionable",
        "spoken": "Risks stay visible and actionable.",
    },
    {
        "id": "08",
        "start": 58.3,
        "end": 60.4,
        "display": "people resources and budget",
        "spoken": "People, resources, and budget.",
    },
    {
        "id": "09",
        "start": 64.6,
        "end": 68.5,
        "display": "ask the assistant for precise answers",
        "spoken": "Ask the assistant for precise answers.",
    },
    {
        "id": "10",
        "start": 72.6,
        "end": 76.8,
        "display": "everything stays connected to the PID",
        "spoken": "Everything stays connected to the P. I. D.",
    },
    {
        "id": "11",
        "start": 77.0,
        "end": 81.5,
        "display": "planning becomes executable",
        "spoken": "Planning becomes executable.",
    },
    {
        "id": "12",
        "start": 81.7,
        "end": 95.3,
        "display": (
            "once your analysis is complete export the entire structured project in PDF Word "
            "or JSON format with the Gantt chart seamlessly embedded in the PDF and also "
            "available as PNG JPEG or SVG for easy sharing and presentation"
        ),
        "spoken": (
            "Once your analysis is complete, export the entire structured project in P. D. F., "
            "Word, or JSON format, with the Gantt chart seamlessly embedded in the P. D. F., "
            "and also available as P. N. G., J-PEG, or S. V. G. for easy sharing and presentation."
        ),
    },
    {
        "id": "13",
        "start": 96.2,
        "end": 99.9,
        "display": "PMOMax start projects correctly every time",
        "spoken": "P. M. O. Max. Start projects correctly every time.",
    },
]


def run(cmd):
    subprocess.run(cmd, check=True)


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
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
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def synthesize_openai(text: str, out_path: Path):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    payload = {
        "model": MODEL,
        "voice": VOICE,
        "response_format": "wav",
        "instructions": INSTRUCTIONS,
        "input": text,
    }
    run(
        [
            "curl",
            "-sS",
            API_URL,
            "-H",
            f"Authorization: Bearer {api_key}",
            "-H",
            "Content-Type: application/json",
            "-d",
            json.dumps(payload),
            "--output",
            str(out_path),
        ]
    )
    if out_path.read_bytes().startswith(b"{"):
        try:
            payload = json.loads(out_path.read_text(encoding="utf-8"))
            raise RuntimeError(payload["error"]["message"])
        except Exception as exc:
            raise RuntimeError(f"OpenAI TTS failed: {exc}") from exc


def synthesize_local(text: str, out_path: Path):
    aiff_path = out_path.with_suffix(".aiff")
    run(
        [
            "say",
            "-v",
            LOCAL_VOICE,
            "-r",
            LOCAL_RATE,
            "-o",
            str(aiff_path),
            text,
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(aiff_path),
            "-ar",
            str(SAMPLE_RATE),
            str(out_path),
        ]
    )
    aiff_path.unlink(missing_ok=True)


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


def ensure_dirs():
    for path in (OUT_DIR, RAW_DIR, PROC_DIR):
        path.mkdir(parents=True, exist_ok=True)


def main():
    ensure_dirs()

    spoken_lines = []
    synth_engine = f"OpenAI:{VOICE}"
    total_runtime = SEGMENTS[-1]["end"] + 0.8

    for seg in SEGMENTS:
        raw_path = RAW_DIR / f"{seg['id']}.wav"
        proc_path = PROC_DIR / f"{seg['id']}.wav"
        try:
            synthesize_openai(seg["spoken"], raw_path)
        except Exception:
            synth_engine = f"macOS say:{LOCAL_VOICE}"
            synthesize_local(seg["spoken"], raw_path)
        raw_duration = ffprobe_duration(raw_path)
        window = seg["end"] - seg["start"]

        # Keep a little tail room inside each subtitle window when adjustment is needed.
        target_max = max(window - 0.12, window * 0.94)
        target_min = window * 0.55

        if raw_duration > target_max:
            factor = raw_duration / target_max
            filter_str = atempo_chain(factor)
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(raw_path),
                    "-filter:a",
                    filter_str,
                    "-ar",
                    str(SAMPLE_RATE),
                    str(proc_path),
                ]
            )
        elif raw_duration < target_min:
            desired = min(window * 0.72, raw_duration / 0.90)
            factor = raw_duration / desired
            filter_str = atempo_chain(factor)
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(raw_path),
                    "-filter:a",
                    filter_str,
                    "-ar",
                    str(SAMPLE_RATE),
                    str(proc_path),
                ]
            )
        else:
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(raw_path),
                    "-ar",
                    str(SAMPLE_RATE),
                    str(proc_path),
                ]
            )

        final_duration = ffprobe_duration(proc_path)
        spoken_lines.append(
            f"{seg['start']:06.1f}-{seg['end']:06.1f} | {seg['spoken']} | actual_duration={final_duration:.3f}s"
        )

    filter_parts = []
    inputs = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=r={SAMPLE_RATE}:cl=mono",
    ]
    for seg in SEGMENTS:
        inputs.extend(["-i", str(PROC_DIR / f"{seg['id']}.wav")])

    for idx, seg in enumerate(SEGMENTS, start=1):
        delay_ms = int(round(seg["start"] * 1000))
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")

    mix_inputs = "".join(f"[a{idx}]" for idx in range(1, len(SEGMENTS) + 1))
    filter_parts.append(
        f"[0:a]{mix_inputs}amix=inputs={len(SEGMENTS) + 1}:normalize=0,"
        "loudnorm=I=-18:LRA=7:TP=-2[out]"
    )
    filter_complex = ";".join(filter_parts)

    final_wav = OUT_DIR / FINAL_WAV_NAME
    final_mp3 = OUT_DIR / FINAL_NAME

    run(
        inputs
        + [
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-t",
            f"{total_runtime:.3f}",
            "-ar",
            str(SAMPLE_RATE),
            str(final_wav),
        ]
    )

    run(
        [
            "ffmpeg",
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
        ]
    )

    (OUT_DIR / SCRIPT_NAME).write_text(
        "\n".join(
            [
                "PMOMax product voiceover spoken script",
                f"Synthesis: {synth_engine}",
                f"Preferred model: {MODEL}",
                "",
            ]
            + spoken_lines
        )
        + "\n",
        encoding="utf-8",
    )

    print(final_mp3)
    print(final_wav)
    print(OUT_DIR / SCRIPT_NAME)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
