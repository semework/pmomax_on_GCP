#!/usr/bin/env python3
import base64
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables" / "pmomax_voiceover_google"
RAW_DIR = OUT_DIR / "raw_segments"
PROC_DIR = OUT_DIR / "processed_segments"
TMP_DIR = OUT_DIR / "tmp"

PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
VOICE = os.environ.get("PMOMAX_GOOGLE_VOICE", "en-US-Chirp3-HD-Leda")
SAMPLE_RATE = 48000
FINAL_NAME = f"pmomax_product_voiceover_{VOICE}_48k.mp3"
FINAL_WAV_NAME = f"pmomax_product_voiceover_{VOICE}_48k.wav"
SCRIPT_NAME = "pmomax_product_voiceover_spoken_script.txt"

SEGMENTS = [
    {
        "id": "01",
        "start": 2.1,
        "end": 9.0,
        "display": "projects fail long before delivery begins",
        "spoken": "Projects fail long before delivery begins.",
        "ssml": '<speak><prosody rate="0.99">Projects fail long before delivery begins.</prosody></speak>',
    },
    {
        "id": "02",
        "start": 10.5,
        "end": 13.3,
        "display": "the cause is almost always weak initiation",
        "spoken": "The cause is almost always weak initiation.",
        "ssml": '<speak><prosody rate="1.05">The cause is almost always weak initiation.</prosody></speak>',
    },
    {
        "id": "03",
        "start": 17.2,
        "end": 21.8,
        "display": "start with raw inputs",
        "spoken": "Start with raw inputs.",
        "ssml": '<speak><prosody rate="1.00">Start with raw inputs.</prosody></speak>',
    },
    {
        "id": "04",
        "start": 26.2,
        "end": 28.8,
        "display": "PMOMax structures them instantly",
        "spoken": "P. M. O. Max structures them instantly.",
        "ssml": (
            '<speak><prosody rate="1.03">'
            '<say-as interpret-as="characters">PMO</say-as> Max structures them instantly.'
            "</prosody></speak>"
        ),
    },
    {
        "id": "05",
        "start": 34.4,
        "end": 36.8,
        "display": "you get a complete PID",
        "spoken": "You get a complete P. I. D.",
        "ssml": (
            '<speak><prosody rate="1.03">You get a complete '
            '<say-as interpret-as="characters">PID</say-as>.'
            "</prosody></speak>"
        ),
    },
    {
        "id": "06",
        "start": 42.0,
        "end": 46.3,
        "display": "governance and compliance are built in",
        "spoken": "Governance and compliance are built in.",
        "ssml": '<speak><prosody rate="1.00">Governance and compliance are built in.</prosody></speak>',
    },
    {
        "id": "07",
        "start": 49.5,
        "end": 52.8,
        "display": "risks stay visible and actionable",
        "spoken": "Risks stay visible and actionable.",
        "ssml": '<speak><prosody rate="1.00">Risks stay visible and actionable.</prosody></speak>',
    },
    {
        "id": "08",
        "start": 58.3,
        "end": 60.4,
        "display": "people resources and budget",
        "spoken": "People, resources, and budget.",
        "ssml": '<speak><prosody rate="1.04">People, resources, and budget.</prosody></speak>',
    },
    {
        "id": "09",
        "start": 64.6,
        "end": 68.5,
        "display": "ask the assistant for precise answers",
        "spoken": "Ask the assistant for precise answers.",
        "ssml": '<speak><prosody rate="1.00">Ask the assistant for precise answers.</prosody></speak>',
    },
    {
        "id": "10",
        "start": 72.6,
        "end": 76.8,
        "display": "everything stays connected to the PID",
        "spoken": "Everything stays connected to the P. I. D.",
        "ssml": (
            '<speak><prosody rate="1.01">Everything stays connected to the '
            '<say-as interpret-as="characters">PID</say-as>.'
            "</prosody></speak>"
        ),
    },
    {
        "id": "11",
        "start": 77.0,
        "end": 81.5,
        "display": "planning becomes executable",
        "spoken": "Planning becomes executable.",
        "ssml": '<speak><prosody rate="1.00">Planning becomes executable.</prosody></speak>',
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
        "ssml": (
            '<speak><prosody rate="1.02">Once your analysis is complete, export the entire structured project in '
            '<say-as interpret-as="characters">PDF</say-as>, Word, or JSON format, '
            'with the Gantt chart seamlessly embedded in the <say-as interpret-as="characters">PDF</say-as>, '
            'and also available as <say-as interpret-as="characters">PNG</say-as>, J-PEG, '
            'or <say-as interpret-as="characters">SVG</say-as> for easy sharing and presentation.'
            "</prosody></speak>"
        ),
    },
    {
        "id": "13",
        "start": 96.2,
        "end": 99.9,
        "display": "PMOMax start projects correctly every time",
        "spoken": "P. M. O. Max. Start projects correctly every time.",
        "ssml": (
            '<speak><prosody rate="1.02"><say-as interpret-as="characters">PMO</say-as> Max. '
            "Start projects correctly every time.</prosody></speak>"
        ),
    },
]


def run(cmd, capture_output=False, text=True):
    return subprocess.run(cmd, check=True, capture_output=capture_output, text=text)


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
    result = run(["gcloud", "auth", "print-access-token"], capture_output=True)
    return result.stdout.strip()


def synthesize_google(token: str, ssml_text: str, out_path: Path):
    payload = {
        "input": {"ssml": ssml_text},
        "voice": {"languageCode": "en-US", "name": VOICE},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": SAMPLE_RATE},
    }
    resp_path = TMP_DIR / f"{out_path.stem}.json"
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
        raise RuntimeError(json.dumps(response))
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


def ensure_dirs():
    for path in (OUT_DIR, RAW_DIR, PROC_DIR, TMP_DIR):
        path.mkdir(parents=True, exist_ok=True)


def process_segment(raw_path: Path, proc_path: Path, window: float):
    raw_duration = ffprobe_duration(raw_path)
    target_max = max(window - 0.08, window * 0.965)
    target_min = window * 0.60

    if raw_duration > target_max:
        factor = raw_duration / target_max
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_path),
                "-filter:a",
                atempo_chain(factor),
                "-ar",
                str(SAMPLE_RATE),
                str(proc_path),
            ]
        )
    elif raw_duration < target_min:
        desired = min(window * 0.70, raw_duration / 0.94)
        factor = raw_duration / desired
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_path),
                "-filter:a",
                atempo_chain(factor),
                "-ar",
                str(SAMPLE_RATE),
                str(proc_path),
            ]
        )
    else:
        run(["ffmpeg", "-y", "-i", str(raw_path), "-ar", str(SAMPLE_RATE), str(proc_path)])


def assemble_final():
    total_runtime = SEGMENTS[-1]["end"] + 0.8
    inputs = ["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono"]
    filter_parts = []

    for seg in SEGMENTS:
        inputs.extend(["-i", str(PROC_DIR / f"{seg['id']}.wav")])

    for idx, seg in enumerate(SEGMENTS, start=1):
        delay_ms = int(round(seg["start"] * 1000))
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")

    mix_inputs = "".join(f"[a{idx}]" for idx in range(1, len(SEGMENTS) + 1))
    filter_parts.append(
        f"[0:a]{mix_inputs}amix=inputs={len(SEGMENTS) + 1}:normalize=0,"
        "highpass=f=55,lowpass=f=17000,loudnorm=I=-18:LRA=6:TP=-2[out]"
    )

    final_wav = OUT_DIR / FINAL_WAV_NAME
    run(
        inputs
        + [
            "-filter_complex",
            ";".join(filter_parts),
            "-map",
            "[out]",
            "-t",
            f"{total_runtime:.3f}",
            "-ar",
            str(SAMPLE_RATE),
            str(final_wav),
        ]
    )

    final_mp3 = OUT_DIR / FINAL_NAME
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
    return final_mp3, final_wav


def main():
    ensure_dirs()
    token = get_token()
    spoken_lines = []

    for seg in SEGMENTS:
        raw_path = RAW_DIR / f"{seg['id']}.wav"
        proc_path = PROC_DIR / f"{seg['id']}.wav"
        synthesize_google(token, seg["ssml"], raw_path)
        process_segment(raw_path, proc_path, seg["end"] - seg["start"])
        spoken_lines.append(
            f"{seg['start']:06.1f}-{seg['end']:06.1f} | {seg['spoken']} | actual_duration={ffprobe_duration(proc_path):.3f}s"
        )

    final_mp3, final_wav = assemble_final()
    (OUT_DIR / SCRIPT_NAME).write_text(
        "\n".join(
            [
                "PMOMax product voiceover spoken script",
                f"Synthesis: Google Cloud Text-to-Speech",
                f"Voice: {VOICE}",
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
