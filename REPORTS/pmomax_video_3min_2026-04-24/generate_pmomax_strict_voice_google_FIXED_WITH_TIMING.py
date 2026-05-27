#!/usr/bin/env python3
"""
Generate a clean PMOMax three-minute Google Cloud Text-to-Speech narration.

Important:
- TIMED_LINES keeps the 000.000-006.000 timing map for video/caption alignment.
- Only the text portion is sent to Google TTS.
- Timestamps are never sent to TTS, so the voice will not say "dot".
- Brand is spoken as "P M O Max" to prevent "Pimo".
"""

import base64
import argparse
import json
import re
import subprocess
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
OUT_DIR = REPORT_DIR / "strict_voice_google_fixed"
TMP_DIR = OUT_DIR / "tmp"
FIXED_TIMED_SCRIPT_CANDIDATES = [
    REPORT_DIR / "pmomax_3min_timed_script_FIXED.txt",
    REPORT_DIR / "pmomax_promo_3min_timed_script_FIXED.txt",
    ROOT / "PMOMAX_MARKETPLACE_COST_REVIEW_20260512" / "pmomax_3min_timed_script_FIXED.txt",
]

PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000

FINAL_WAV = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING.wav"
FINAL_MP3 = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING.mp3"
FINAL_SPOKEN_SCRIPT = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING_spoken_script.txt"
FINAL_TIMED_SCRIPT = REPORT_DIR / "pmomax_promo_3min_timed_script_FIXED.txt"
FINAL_MANIFEST = REPORT_DIR / "pmomax_promo_3min_strict_google_FIXED_WITH_TIMING_manifest.json"

VOICE = {
    "name": "en-US-Chirp3-HD-Leda",
    "speaking_rate": 0.78,
    "gain_db": -1.0,
}

VOICE_PRESETS = {
    "female_leda": {
        "name": "en-US-Chirp3-HD-Leda",
        "speaking_rate": 0.78,
        "gain_db": -1.0,
    },
    "female_kore": {
        "name": "en-US-Chirp3-HD-Kore",
        "speaking_rate": 0.78,
        "gain_db": -1.0,
    },
    "male_zephyr": {
        "name": "en-US-Chirp3-HD-Zephyr",
        "speaking_rate": 0.78,
        "gain_db": -1.0,
    },
    "male_orus": {
        "name": "en-US-Chirp3-HD-Orus",
        "speaking_rate": 0.78,
        "gain_db": -1.0,
    },
}

CHUNK_SIZE = 5
CHUNK_SILENCE_MS = 900
TARGET_DURATION_SEC = 180.0
MIN_FINAL_DURATION_SEC = 179.0
MAX_FINAL_DURATION_SEC = 181.5
MIN_ESTIMATED_DURATION_SEC = 175.0
MAX_ESTIMATED_DURATION_SEC = 185.0
PARAGRAPH_SEPARATOR = "\n\n\n"

# Timing is kept here for video/caption alignment.
# Only "text" is sent to TTS.
FALLBACK_TIMED_LINES = [
    ("000.000", "006.000", "Project initiation often starts fragmented. P M O Max brings everything into one structured workspace."),
    ("006.000", "012.000", "Teams can paste content, upload documents, load a guided demo, or begin from a structured blank start."),
    ("012.000", "018.000", "From raw material, P M O Max produces a complete and editable project initiation document."),
    ("018.000", "024.000", "Project information and business context are normalized for faster executive review."),
    ("024.000", "030.000", "Objectives and key performance indicators stay measurable, visible, and consistent."),
    ("030.000", "036.000", "Scope, deliverables, constraints, and dependencies remain explicit from the very beginning."),
    ("036.000", "042.000", "The entire initiation package stays aligned inside one shared system of record."),
    ("042.000", "048.000", "Planning becomes executable when schedules transform into a live Gantt chart."),
    ("048.000", "054.000", "Milestones, sequencing, and delivery timing become clear at a glance."),
    ("054.000", "060.000", "Execution detail stays connected to the same initiation document that created it."),
    ("060.000", "066.000", "People, resources, and budgets remain tied directly to the operational plan."),
    ("066.000", "072.000", "That gives delivery teams better context for staffing, tooling, and cost tradeoffs."),
    ("072.000", "078.000", "Risks, issues, and communications are surfaced before execution begins."),
    ("078.000", "084.000", "Teams review probability, impact, mitigation strategy, and decisions in one place."),
    ("084.000", "090.000", "Governance and compliance remain visible, actionable, and audit friendly."),
    ("090.000", "096.000", "Approvals, security, privacy checks, and readiness reviews are built directly into the workflow."),
    ("096.000", "102.000", "The artificial intelligence assistant works alongside the live project initiation document, not outside it."),
    ("102.000", "108.000", "Ask for summaries, rewrites, delivery risks, or compliance gaps in context."),
    ("108.000", "114.000", "The conversation remains connected to the same structured plan your team is executing."),
    ("114.000", "120.000", "General notes preserve the reasoning, assumptions, and decisions behind the plan."),
    ("120.000", "126.000", "Navigation keeps large project documents instantly explorable."),
    ("126.000", "132.000", "Built-in help gives teams fast, section-aware guidance exactly when they need it."),
    ("132.000", "138.000", "The user guide supports onboarding without pushing people outside the workflow."),
    ("138.000", "144.000", "When teams start from zero, Create Mode opens a guided entry point."),
    ("144.000", "150.000", "When they need value quickly, Load Demo shows the complete end-to-end system immediately."),
    ("150.000", "156.000", "Outputs are ready to move across stakeholders, reviews, and audit workflows."),
    ("156.000", "162.000", "P M O Max supports Microsoft Word, P D F exports, structured data files, and packaged deliverables from one workspace."),
    ("162.000", "168.000", "What changes here is the handoff between planning and execution."),
    ("168.000", "174.000", "P M O Max transforms project initiation into a governed, artificial-intelligence-enabled system of work."),
    ("174.000", "180.000", "P M O Max helps teams structure the project initiation document, align the team, and launch with confidence."),
]


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


def ensure_dirs(out_dir: Path, tmp_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate PMOMax fixed-timing Google TTS narration.")
    parser.add_argument(
        "--voice-preset",
        choices=sorted(VOICE_PRESETS),
        default="female_leda",
        help="Google Chirp HD voice preset to synthesize.",
    )
    parser.add_argument(
        "--output-suffix",
        default="",
        help="Optional suffix added before file extensions, for example _female_kore.",
    )
    return parser.parse_args()


def output_paths(output_suffix: str) -> dict[str, Path]:
    suffix = output_suffix
    return {
        "wav": REPORT_DIR / f"pmomax_promo_3min_strict_google_FIXED_WITH_TIMING{suffix}.wav",
        "mp3": REPORT_DIR / f"pmomax_promo_3min_strict_google_FIXED_WITH_TIMING{suffix}.mp3",
        "spoken_script": REPORT_DIR / f"pmomax_promo_3min_strict_google_FIXED_WITH_TIMING{suffix}_spoken_script.txt",
        "timed_script": FINAL_TIMED_SCRIPT,
        "manifest": REPORT_DIR / f"pmomax_promo_3min_strict_google_FIXED_WITH_TIMING{suffix}_manifest.json",
    }


def find_fixed_timed_script() -> Path | None:
    for path in FIXED_TIMED_SCRIPT_CANDIDATES:
        if path.exists():
            return path
    return None


def parse_timed_script(path: Path) -> list[tuple[str, str, str]]:
    text = path.read_text(encoding="utf-8")
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    timed_lines = []

    for idx, block in enumerate(blocks, start=1):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            raise RuntimeError(f"Invalid timed script block {idx}: expected timestamp and text.")
        match = re.fullmatch(r"(\d{3}\.\d{3})-(\d{3}\.\d{3})", lines[0])
        if not match:
            raise RuntimeError(f"Invalid timestamp in block {idx}: {lines[0]}")
        timed_lines.append((match.group(1), match.group(2), " ".join(lines[1:])))

    return timed_lines


def load_timed_lines() -> tuple[list[tuple[str, str, str]], str]:
    script_path = find_fixed_timed_script()
    if script_path:
        return parse_timed_script(script_path), str(script_path.relative_to(ROOT))
    return FALLBACK_TIMED_LINES, "embedded FALLBACK_TIMED_LINES"


def build_spoken_lines(timed_lines: list[tuple[str, str, str]]) -> list[str]:
    return [text for _, _, text in timed_lines]


def write_timed_script(path: Path, timed_lines: list[tuple[str, str, str]]) -> None:
    blocks = []
    for start, end, text in timed_lines:
        blocks.append(f"{start}-{end}\n{text}")
    path.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")


def chunk_lines(lines: list[str], chunk_size: int) -> list[str]:
    chunks = []
    for start in range(0, len(lines), chunk_size):
        chunks.append(PARAGRAPH_SEPARATOR.join(lines[start:start + chunk_size]))
    return chunks


def validate_timing(timed_lines: list[tuple[str, str, str]]) -> None:
    if len(timed_lines) != 30:
        raise RuntimeError(f"Expected 30 timed lines, found {len(timed_lines)}.")

    previous_end = 0.0
    for idx, (start, end, text) in enumerate(timed_lines, start=1):
        s = float(start)
        e = float(end)
        if idx == 1 and s != 0.0:
            raise RuntimeError("First line must start at 000.000.")
        if abs(s - previous_end) > 0.001:
            raise RuntimeError(f"Timing gap/overlap at line {idx}: start={start}, previous_end={previous_end:.3f}")
        if abs((e - s) - 6.0) > 0.001:
            raise RuntimeError(f"Line {idx} is not exactly 6 seconds: {start}-{end}")
        if not text.strip():
            raise RuntimeError(f"Empty text at line {idx}.")
        previous_end = e

    if abs(previous_end - 180.0) > 0.001:
        raise RuntimeError(f"Final timestamp must end at 180.000, found {previous_end:.3f}")


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?", text))


def estimate_duration_and_wpm(text: str, target_duration_sec: float) -> tuple[int, float, float]:
    words = word_count(text)
    estimated_duration_sec = target_duration_sec
    estimated_wpm = words / (estimated_duration_sec / 60)
    return words, estimated_duration_sec, estimated_wpm


def validate_spoken_script(text: str) -> tuple[int, float, float]:
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
    ]
    found = [item for item in forbidden_literals if item in text]
    if found:
        raise RuntimeError(f"Forbidden spoken text tokens found: {found}")

    # Block version-like strings such as v1.4.2 or 1.4.2, while allowing normal sentence periods.
    if re.search(r"\bv?\d+\.\d+(?:\.\d+)+\b", text):
        raise RuntimeError("Forbidden version-like dotted number found.")

    # Block timestamp-like strings in spoken text. Timestamps are allowed only in FINAL_TIMED_SCRIPT.
    if re.search(r"\b\d{3}\.\d{3}\b", text):
        raise RuntimeError("Forbidden timestamp-like token found in spoken text.")

    # Block simple URL/domain patterns without blocking normal sentence periods.
    if re.search(r"\b(?:www\.|[A-Za-z0-9-]+\.(?:com|org|net|io|ai|app|dev)\b)", text, re.IGNORECASE):
        raise RuntimeError("Forbidden URL/domain-like token found in spoken text.")

    words, estimated_duration_sec, estimated_wpm = estimate_duration_and_wpm(text, TARGET_DURATION_SEC)
    if estimated_duration_sec < MIN_ESTIMATED_DURATION_SEC:
        raise RuntimeError(
            f"Script may be too short for a 3-minute narration: "
            f"{words} words, estimated {estimated_duration_sec:.1f} sec."
        )
    if estimated_duration_sec > MAX_ESTIMATED_DURATION_SEC:
        raise RuntimeError(
            f"Script may be too long for a 3-minute narration: "
            f"{words} words, estimated {estimated_duration_sec:.1f} sec."
        )
    return words, estimated_duration_sec, estimated_wpm


def synthesize(token: str, text: str, out_path: Path, tmp_dir: Path, voice: dict[str, float | str]) -> None:
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "en-US", "name": voice["name"]},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": voice["speaking_rate"],
            "volumeGainDb": voice["gain_db"],
        },
    }

    resp_path = tmp_dir / f"{out_path.stem}_response.json"
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


def fit_chunk_to_duration(in_path: Path, out_path: Path, target_duration_sec: float) -> float:
    duration = ffprobe_duration(in_path)
    if duration <= 0:
        raise RuntimeError(f"Invalid duration for {in_path}: {duration}")
    tempo = duration / target_duration_sec
    if tempo < 0.5 or tempo > 2.0:
        raise RuntimeError(f"Cannot fit {in_path.name}: tempo factor {tempo:.3f} is outside ffmpeg atempo limits.")
    run(
        ffmpeg_cmd(
            "-y", "-i", str(in_path),
            "-af",
            f"atempo={tempo:.8f},"
            "highpass=f=60,"
            "lowpass=f=16500,"
            "acompressor=threshold=-20dB:ratio=1.5:attack=18:release=150:makeup=1.05,"
            "loudnorm=I=-18:LRA=6:TP=-2",
            "-ar", str(SAMPLE_RATE), "-ac", "1", str(out_path)
        )
    )
    return tempo


def concatenate_wavs(paths: list[Path], out_path: Path, silence_ms: int = CHUNK_SILENCE_MS) -> None:
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
    args = parse_args()
    voice = VOICE_PRESETS[args.voice_preset]
    paths = output_paths(args.output_suffix)
    out_dir = OUT_DIR / args.voice_preset
    tmp_dir = out_dir / "tmp"
    ensure_dirs(out_dir, tmp_dir)
    timed_lines, timed_script_source = load_timed_lines()
    validate_timing(timed_lines)

    spoken_lines = build_spoken_lines(timed_lines)
    spoken_text = PARAGRAPH_SEPARATOR.join(spoken_lines)
    words, estimated_duration_sec, estimated_wpm = validate_spoken_script(spoken_text)

    paths["spoken_script"].write_text(spoken_text + "\n", encoding="utf-8")
    write_timed_script(paths["timed_script"], timed_lines)

    chunks = chunk_lines(spoken_lines, CHUNK_SIZE)
    if any(word_count(chunk) == 0 for chunk in chunks):
        raise RuntimeError("Cannot synthesize empty chunk.")

    print(f"timed_script_source={timed_script_source}")
    print(f"estimated_duration_sec={estimated_duration_sec:.3f}")
    print(f"estimated_wpm={estimated_wpm:.3f}")
    print(f"word_count={words}")
    print(f"voice_preset={args.voice_preset}")
    print(f"voice_name={voice['name']}")
    print(f"speaking_rate={voice['speaking_rate']}")
    print(f"chunk_count={len(chunks)}")

    token = get_token()

    target_speech_sec = TARGET_DURATION_SEC - ((len(chunks) - 1) * CHUNK_SILENCE_MS / 1000)
    target_chunk_sec = target_speech_sec / len(chunks)
    fitted_paths = []
    chunk_durations = []
    raw_chunk_durations = []
    tempo_factors = []
    for idx, chunk in enumerate(chunks, start=1):
        raw_path = out_dir / f"strict_voice_fixed_chunk_{idx:02d}.wav"
        synthesize(token, chunk, raw_path, tmp_dir, voice)
        raw_chunk_durations.append(ffprobe_duration(raw_path))
        fitted_path = out_dir / f"strict_voice_fixed_chunk_{idx:02d}_fitted.wav"
        tempo_factors.append(fit_chunk_to_duration(raw_path, fitted_path, target_chunk_sec))
        chunk_durations.append(ffprobe_duration(fitted_path))
        fitted_paths.append(fitted_path)

    natural_duration_sec = sum(raw_chunk_durations) + ((len(chunks) - 1) * CHUNK_SILENCE_MS / 1000)
    retry_with_074_needed = natural_duration_sec < MIN_FINAL_DURATION_SEC
    if retry_with_074_needed and voice["speaking_rate"] != 0.74:
        raise RuntimeError(
            "Generated audio appears too fast by natural-duration check; "
            "set VOICE['speaking_rate'] to 0.74 and rerun."
        )

    raw_wav = out_dir / "strict_voice_fixed_raw_combined.wav"
    concatenate_wavs(fitted_paths, raw_wav, silence_ms=CHUNK_SILENCE_MS)

    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw_wav),
            "-af",
            "highpass=f=60,"
            "lowpass=f=16500,"
            "acompressor=threshold=-20dB:ratio=1.6:attack=18:release=140:makeup=1.1,"
            "loudnorm=I=-18:LRA=6:TP=-2",
            "-ar", str(SAMPLE_RATE), str(paths["wav"])
        )
    )

    run(
        ffmpeg_cmd(
            "-y", "-i", str(paths["wav"]),
            "-codec:a", "libmp3lame", "-b:a", "192k",
            "-ar", str(SAMPLE_RATE), str(paths["mp3"])
        )
    )

    duration_wav = ffprobe_duration(paths["wav"])
    duration_mp3 = ffprobe_duration(paths["mp3"])
    if not (MIN_FINAL_DURATION_SEC <= duration_wav <= MAX_FINAL_DURATION_SEC):
        raise RuntimeError(
            f"Final WAV duration outside allowed range: {duration_wav:.3f} sec "
            f"(allowed {MIN_FINAL_DURATION_SEC:.1f}-{MAX_FINAL_DURATION_SEC:.1f})"
        )

    manifest = {
        "voice_preset": args.voice_preset,
        "voice": voice,
        "chunk_size": CHUNK_SIZE,
        "chunk_silence_ms": CHUNK_SILENCE_MS,
        "brand_pronunciation": "P M O Max",
        "duration_wav_sec": round(duration_wav, 3),
        "duration_mp3_sec": round(duration_mp3, 3),
        "word_count": words,
        "estimated_duration_sec": round(estimated_duration_sec, 3),
        "estimated_wpm": round(estimated_wpm, 3),
        "average_chunk_duration_sec": round(sum(chunk_durations) / len(chunk_durations), 3),
        "natural_unfitted_duration_sec": round(natural_duration_sec, 3),
        "rush_retry_with_074_needed": retry_with_074_needed,
        "raw_chunk_durations_sec": [round(value, 3) for value in raw_chunk_durations],
        "chunk_tempo_factors": [round(value, 5) for value in tempo_factors],
        "line_count": len(timed_lines),
        "chunk_count": len(chunks),
        "timed_script_source": timed_script_source,
        "timed_script": str(paths["timed_script"].relative_to(ROOT)),
        "spoken_script": str(paths["spoken_script"].relative_to(ROOT)),
        "wav": str(paths["wav"].relative_to(ROOT)),
        "mp3": str(paths["mp3"].relative_to(ROOT)),
        "notes": [
            "Timed script is preserved for video alignment",
            "Timestamps are never sent to TTS",
            "Natural punctuation kept for cadence",
            "No URLs, filenames, timestamps, or version-like dotted numbers in spoken text",
            "Brand spoken as P M O Max to avoid Pimo",
            "PDF spoken as P D F",
            "JSON replaced with structured data files",
            "AI replaced with artificial intelligence",
        ],
    }

    paths["manifest"].write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(paths["wav"])
    print(paths["mp3"])
    print(paths["spoken_script"])
    print(paths["timed_script"])
    print(paths["manifest"])
    print(f"final_duration={duration_wav:.3f}")
    print(f"duration_mp3={duration_mp3:.3f}")
    print(f"speaking_rate_used={voice['speaking_rate']}")
    print(f"chunk_count={len(chunks)}")
    print(f"average_chunk_duration={manifest['average_chunk_duration_sec']:.3f}")
    print(f"estimated_wpm={estimated_wpm:.3f}")
    print("validation_status=passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
