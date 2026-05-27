#!/usr/bin/env python3
"""
Generate a clean PMOMax three-minute Google Cloud Text-to-Speech narration.

Fixes included:
- Avoids PMOMax being pronounced as "Pimo" by speaking the brand as "P M O Max".
- Avoids "dot" pronunciation by blocking URLs, filenames, and version strings.
- Uses natural punctuation for cadence instead of stripping all periods.
- Slows the voice and inserts longer section pauses.
- Synthesizes larger sections, not tiny six-second fragments, for smoother prosody.
- Writes the final spoken script and manifest for review.
"""

import base64
import json
import re
import subprocess
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
OUT_DIR = REPORT_DIR / "strict_voice_google_fixed"
TMP_DIR = OUT_DIR / "tmp"

PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000

FINAL_WAV = REPORT_DIR / "pmomax_promo_3min_strict_google_voice_FIXED.wav"
FINAL_MP3 = REPORT_DIR / "pmomax_promo_3min_strict_google_voice_FIXED.mp3"
FINAL_SCRIPT = REPORT_DIR / "pmomax_promo_3min_strict_google_voice_script_FIXED.txt"
FINAL_MANIFEST = REPORT_DIR / "pmomax_promo_3min_strict_google_voice_manifest_FIXED.json"

VOICE = {
    "name": "en-US-Chirp3-HD-Leda",
    "speaking_rate": 0.88,
    "gain_db": -1.0,
}

# Use "P M O Max", not "PMOMax" or "Pee Em Oh Max".
# This prevents Google TTS from collapsing the word into "Pimo".
SPOKEN_LINES = [
    "Project initiation often starts fragmented. P M O Max brings everything into one structured workspace.",
    "Teams can paste content, upload documents, load a guided demo, or begin from a structured blank start.",
    "From raw material, P M O Max produces a complete and editable project initiation document.",
    "Project information and business context are normalized for faster executive review.",
    "Objectives and key performance indicators stay measurable, visible, and consistent.",
    "Scope, deliverables, constraints, and dependencies remain explicit from the very beginning.",
    "The entire initiation package stays aligned inside one shared system of record.",
    "Planning becomes executable when schedules transform into a live Gantt chart.",
    "Milestones, sequencing, and delivery timing become clear at a glance.",
    "Execution detail stays connected to the same initiation document that created it.",
    "People, resources, and budgets remain tied directly to the operational plan.",
    "That gives delivery teams better context for staffing, tooling, and cost tradeoffs.",
    "Risks, issues, and communications are surfaced before execution begins.",
    "Teams review probability, impact, mitigation strategy, and decisions in one place.",
    "Governance and compliance remain visible, actionable, and audit friendly.",
    "Approvals, security, privacy checks, and readiness reviews are built directly into the workflow.",
    "The artificial intelligence assistant works alongside the live project initiation document, not outside it.",
    "Ask for summaries, rewrites, delivery risks, or compliance gaps in context.",
    "The conversation remains connected to the same structured plan your team is executing.",
    "General notes preserve the reasoning, assumptions, and decisions behind the plan.",
    "Navigation keeps large project documents instantly explorable.",
    "Built-in help gives teams fast, section-aware guidance exactly when they need it.",
    "The user guide supports onboarding without pushing people outside the workflow.",
    "When teams start from zero, Create Mode opens a guided entry point.",
    "When they need value quickly, Load Demo shows the complete end-to-end system immediately.",
    "Outputs are ready to move across stakeholders, reviews, and audit workflows.",
    "P M O Max supports Microsoft Word, P D F exports, structured data files, and packaged deliverables from one workspace.",
    "What changes here is the handoff between planning and execution.",
    "P M O Max transforms project initiation into a governed, artificial-intelligence-enabled system of work.",
    "P M O Max helps teams structure the project initiation document, align the team, and launch with confidence.",
]

# Larger chunks prevent the voice from sounding chopped.
# Each chunk is roughly 20–35 seconds depending on voice speed.
CHUNK_SIZE = 5


def run(cmd, capture_output=False):
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
    return run(["gcloud", "auth", "print-access-token"], capture_output=True).stdout.strip()


def ensure_dirs() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)


def chunk_lines(lines: list[str], chunk_size: int) -> list[str]:
    chunks = []
    for start in range(0, len(lines), chunk_size):
        # Double newline gives Google TTS a stronger paragraph pause.
        chunks.append("\n\n".join(lines[start:start + chunk_size]))
    return chunks


def validate_script(text: str) -> None:
    """
    Keep normal sentence punctuation, but block items that commonly cause TTS to say
    "dot", "slash", "dash", or collapse the brand name.
    """
    forbidden_literals = [
        "PMOMax",
        "Pee Em Oh Max",
        "Pimo",
        "JSON",
        "Jason",
        "JAY",
        "AI",
        "KPI",
        "http://",
        "https://",
        ".com",
        ".py",
        ".json",
        ".mp3",
        ".wav",
        "|",
        "_",
        "156.000",
        "162.000",
    ]
    found = [item for item in forbidden_literals if item in text]
    if found:
        raise RuntimeError(f"Forbidden spoken text tokens found: {found}")

    # Block version-like strings such as v1.4.2 or 1.4.2, but allow ordinary sentence periods.
    if re.search(r"\bv?\d+\.\d+(?:\.\d+)+\b", text):
        raise RuntimeError("Forbidden version-like dotted number found.")

    # Block raw timestamp-like strings.
    if re.search(r"\b\d{3}\.\d{3}\b", text):
        raise RuntimeError("Forbidden timestamp-like token found.")

    # Basic duration sanity check.
    words = re.findall(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?", text)
    estimated_duration_sec = len(words) / 130 * 60
    if estimated_duration_sec < 155:
        raise RuntimeError(
            f"Script may be too short for a 3-minute narration: "
            f"{len(words)} words, estimated {estimated_duration_sec:.1f} sec."
        )
    if estimated_duration_sec > 205:
        raise RuntimeError(
            f"Script may be too long for a 3-minute narration: "
            f"{len(words)} words, estimated {estimated_duration_sec:.1f} sec."
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
    resp_path = TMP_DIR / f"{out_path.stem}_response.json"
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
        raise RuntimeError(json.dumps(response, indent=2))
    out_path.write_bytes(base64.b64decode(response["audioContent"]))


def concatenate_wavs(paths: list[Path], out_path: Path, silence_ms: int = 550) -> None:
    silence_frames = int(SAMPLE_RATE * silence_ms / 1000)
    silence = b"\x00\x00" * silence_frames
    combined = bytearray()

    for idx, path in enumerate(paths):
        with wave.open(str(path), "rb") as wf:
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != SAMPLE_RATE:
                raise RuntimeError(f"Unexpected WAV format for {path}")
            combined.extend(wf.readframes(wf.getnframes()))
        if idx < len(paths) - 1:
            combined.extend(silence)

    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(combined))


def main() -> None:
    ensure_dirs()

    spoken_text = "\n\n".join(SPOKEN_LINES)
    validate_script(spoken_text)
    FINAL_SCRIPT.write_text(spoken_text + "\n", encoding="utf-8")

    chunks = chunk_lines(SPOKEN_LINES, CHUNK_SIZE)
    token = get_token()

    raw_paths = []
    for idx, chunk in enumerate(chunks, start=1):
        raw_path = OUT_DIR / f"strict_voice_fixed_chunk_{idx:02d}.wav"
        synthesize(token, chunk, raw_path)
        raw_paths.append(raw_path)

    raw_wav = OUT_DIR / "strict_voice_fixed_raw_combined.wav"
    concatenate_wavs(raw_paths, raw_wav, silence_ms=550)

    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw_wav),
            "-af",
            "highpass=f=60,"
            "lowpass=f=16500,"
            "acompressor=threshold=-20dB:ratio=1.6:attack=18:release=140:makeup=1.1,"
            "loudnorm=I=-18:LRA=6:TP=-2",
            "-ar", str(SAMPLE_RATE), str(FINAL_WAV)
        )
    )

    run(
        ffmpeg_cmd(
            "-y", "-i", str(FINAL_WAV),
            "-codec:a", "libmp3lame", "-b:a", "192k",
            "-ar", str(SAMPLE_RATE), str(FINAL_MP3)
        )
    )

    manifest = {
        "voice": VOICE,
        "chunk_size": CHUNK_SIZE,
        "brand_pronunciation": "P M O Max",
        "duration_wav_sec": round(ffprobe_duration(FINAL_WAV), 3),
        "duration_mp3_sec": round(ffprobe_duration(FINAL_MP3), 3),
        "line_count": len(SPOKEN_LINES),
        "chunk_count": len(chunks),
        "character_count": len(spoken_text),
        "script": str(FINAL_SCRIPT.relative_to(ROOT)),
        "wav": str(FINAL_WAV.relative_to(ROOT)),
        "mp3": str(FINAL_MP3.relative_to(ROOT)),
        "notes": [
            "Audio only",
            "Natural punctuation kept for cadence",
            "No URLs, filenames, timestamps, or version-like dotted numbers in spoken text",
            "Brand spoken as P M O Max to avoid Pimo",
            "PDF spoken as P D F",
            "JSON replaced with structured data files",
            "AI replaced with artificial intelligence",
        ],
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
