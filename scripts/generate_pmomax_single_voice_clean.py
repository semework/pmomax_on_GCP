#!/usr/bin/env python3
import base64
import html
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
OUT_DIR = REPORT_DIR / "single_voice_clean_google"
TMP_DIR = OUT_DIR / "tmp"
PROJECT = "katalyststreet-public"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
SAMPLE_RATE = 48000

FINAL_MP3 = REPORT_DIR / "pmomax_promo_3min_single_voice_clean.mp3"
FINAL_WAV = REPORT_DIR / "pmomax_promo_3min_single_voice_clean.wav"
FINAL_SCRIPT = REPORT_DIR / "pmomax_promo_3min_single_voice_clean_script.txt"
FINAL_MANIFEST = REPORT_DIR / "pmomax_promo_3min_single_voice_clean_manifest.json"

VOICE = {
    "label": "Premium single voice",
    "voice": "en-US-Chirp3-HD-Leda",
    "rate": 0.97,
    "pitch": "-0.8st",
    "gain_db": -0.8,
    "pause_ms": 90,
    "loudnorm": "I=-18:LRA=6:TP=-2",
}

SEGMENTS = [
    {"id": "01", "start": 0.0, "end": 6.0, "text": "Project initiation often starts fragmented. PMOMax brings it into one structured workspace."},
    {"id": "02", "start": 6.0, "end": 12.0, "text": "Teams can paste, upload, load a demo, or begin from a guided blank start."},
    {"id": "03", "start": 12.0, "end": 18.0, "text": "From raw material, PMOMax produces a complete, editable project initiation document."},
    {"id": "04", "start": 18.0, "end": 24.0, "text": "Project information and context are normalized for faster review."},
    {"id": "05", "start": 24.0, "end": 30.0, "text": "Objectives and key performance indicators stay measurable, visible, and consistent."},
    {"id": "06", "start": 30.0, "end": 36.0, "text": "Scope, deliverables, constraints, and dependencies stay explicit from the start."},
    {"id": "07", "start": 36.0, "end": 42.0, "text": "The full initiation package stays aligned in one shared system."},
    {"id": "08", "start": 42.0, "end": 48.0, "text": "Planning becomes executable when schedules turn into a live gantt chart."},
    {"id": "09", "start": 48.0, "end": 54.0, "text": "Milestones, sequencing, and delivery timing become clear at a glance."},
    {"id": "10", "start": 54.0, "end": 60.0, "text": "Execution detail stays connected to the initiation document that created it."},
    {"id": "11", "start": 60.0, "end": 66.0, "text": "People, resources, and budget stay tied directly to the plan."},
    {"id": "12", "start": 66.0, "end": 72.0, "text": "That gives delivery teams context for staffing, tooling, and cost tradeoffs."},
    {"id": "13", "start": 72.0, "end": 78.0, "text": "Risks, issues, and communications are surfaced before execution begins."},
    {"id": "14", "start": 78.0, "end": 84.0, "text": "Teams review probability, impact, mitigation, and decisions in one place."},
    {"id": "15", "start": 84.0, "end": 90.0, "text": "Governance and compliance stay visible, actionable, and audit friendly."},
    {"id": "16", "start": 90.0, "end": 96.0, "text": "Approvals, security, privacy, and readiness checks are built into the workflow."},
    {"id": "17", "start": 96.0, "end": 102.0, "text": "The AI assistant works alongside the live project initiation document, not outside it."},
    {"id": "18", "start": 102.0, "end": 108.0, "text": "Ask for summaries, rewrites, delivery risks, or compliance gaps in context."},
    {"id": "19", "start": 108.0, "end": 114.0, "text": "The conversation stays connected to the same structured plan your team is executing."},
    {"id": "20", "start": 114.0, "end": 120.0, "text": "General Notes preserve the reasoning, assumptions, and decisions behind the plan."},
    {"id": "21", "start": 120.0, "end": 126.0, "text": "Navigation keeps large project documents instantly explorable."},
    {"id": "22", "start": 126.0, "end": 132.0, "text": "Built-in help gives teams fast, section-aware guidance when they need it."},
    {"id": "23", "start": 132.0, "end": 138.0, "text": "The user guide supports onboarding without pushing people out of the workflow."},
    {"id": "24", "start": 138.0, "end": 144.0, "text": "When teams start from zero, Create mode opens a guided entry point."},
    {"id": "25", "start": 144.0, "end": 150.0, "text": "When they need value fast, Load Demo shows the end-to-end system immediately."},
    {"id": "26", "start": 150.0, "end": 156.0, "text": "Outputs are ready to move across stakeholders, reviews, and audits."},
    {"id": "27", "start": 156.0, "end": 162.0, "text": "PMOMax exports Word, PDF, JSON, and packaged deliverables."},
    {"id": "28", "start": 162.0, "end": 168.0, "text": "What changes here is the handoff between planning and execution."},
    {"id": "29", "start": 168.0, "end": 174.0, "text": "PMOMax turns project initiation into a governed, AI-assisted system of work."},
    {"id": "30", "start": 174.0, "end": 180.0, "text": "PMOMax: structure the project initiation document, align the team, and launch with confidence."},
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


def markup(text: str) -> str:
    escaped = html.escape(text, quote=False)
    replacements = [
        ("PMOMax", '<sub alias="Pee-Em-Oh-Max">PMOMax</sub>'),
        ("project initiation document", '<sub alias="project initiation document">project initiation document</sub>'),
        ("key performance indicators", '<sub alias="key performance indicators">key performance indicators</sub>'),
        ("AI-assisted", '<say-as interpret-as="characters">AI</say-as>-assisted'),
        ("AI assistant", '<say-as interpret-as="characters">AI</say-as> assistant'),
        ("AI", '<say-as interpret-as="characters">AI</say-as>'),
        ("PDF", '<say-as interpret-as="characters">PDF</say-as>'),
        ("PNG", '<say-as interpret-as="characters">PNG</say-as>'),
        ("SVG", '<say-as interpret-as="characters">SVG</say-as>'),
        ("JSON", '<sub alias="jay-sawn">JSON</sub>'),
        ("JPEG", '<sub alias="jay-peg">JPEG</sub>'),
        ("gantt chart", '<sub alias="gant chart">gantt chart</sub>'),
        ("gantt", '<sub alias="gant">gantt</sub>'),
    ]
    out = escaped
    placeholders = []
    for idx, (old, new) in enumerate(replacements):
        placeholder = f"__PMOMAX_TTS_MARKUP_{idx}__"
        if old in out:
            out = out.replace(old, placeholder)
            placeholders.append((placeholder, new))
    for placeholder, new in placeholders:
        out = out.replace(placeholder, new)
    return out


def build_ssml(text: str, pause_ms: int) -> str:
    return (
        "<speak>"
        f'<s><prosody pitch="{VOICE["pitch"]}" volume="medium">{markup(text)}</prosody></s>'
        f'<break time="{pause_ms}ms"/>'
        "</speak>"
    )


def synthesize(token: str, text: str, out_path: Path, speaking_rate: float, pause_ms: int):
    payload = {
        "input": {"ssml": build_ssml(text, pause_ms)},
        "voice": {"languageCode": "en-US", "name": VOICE["voice"]},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": speaking_rate,
            "volumeGainDb": VOICE["gain_db"],
        },
    }
    resp_path = TMP_DIR / f"{out_path.stem}.json"
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


def synthesize_best_fit(token: str, seg: dict, raw_path: Path) -> float:
    attempts = [
        (VOICE["rate"], VOICE["pause_ms"]),
        (min(1.02, VOICE["rate"] + 0.02), 70),
        (min(1.05, VOICE["rate"] + 0.05), 50),
        (min(1.08, VOICE["rate"] + 0.08), 40),
    ]
    window = seg["end"] - seg["start"]
    best = None
    best_bytes = None
    for rate, pause_ms in attempts:
        synthesize(token, seg["text"], raw_path, rate, pause_ms)
        duration = ffprobe_duration(raw_path)
        audio = raw_path.read_bytes()
        if best is None or abs(duration - (window - 0.15)) < abs(best - (window - 0.15)):
            best = duration
            best_bytes = audio
        if duration <= window - 0.02:
            return duration
    raw_path.write_bytes(best_bytes)
    return float(best)


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


def process_segment(raw_path: Path, proc_path: Path, window: float):
    cleaned_path = proc_path.with_name(f"{proc_path.stem}_clean.wav")
    fitted_path = proc_path.with_name(f"{proc_path.stem}_fit.wav")
    target_max = max(0.2, window - 0.18)
    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw_path),
            "-af", "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.02:stop_periods=0",
            "-ar", str(SAMPLE_RATE), str(cleaned_path)
        )
    )
    duration = ffprobe_duration(cleaned_path)
    if duration < window * 0.35:
        run(ffmpeg_cmd("-y", "-i", str(raw_path), "-ar", str(SAMPLE_RATE), str(cleaned_path)))
        duration = ffprobe_duration(cleaned_path)

    if duration > target_max:
        factor = duration / target_max
        run(ffmpeg_cmd("-y", "-i", str(cleaned_path), "-filter:a", atempo_chain(factor), "-ar", str(SAMPLE_RATE), str(fitted_path)))
    else:
        run(ffmpeg_cmd("-y", "-i", str(cleaned_path), "-ar", str(SAMPLE_RATE), str(fitted_path)))

    # Final guard: every segment must fit its scheduled slot. Without this,
    # fixed-start assembly causes audible overlap with the next segment.
    fade_start = max(0.0, target_max - 0.06)
    run(
        ffmpeg_cmd(
            "-y", "-i", str(fitted_path),
            "-af", f"atrim=0:{target_max:.3f},asetpts=N/SR/TB,afade=t=out:st={fade_start:.3f}:d=0.05",
            "-ar", str(SAMPLE_RATE), str(proc_path)
        )
    )


def assemble(segments: list[dict]) -> tuple[Path, Path]:
    total_runtime = SEGMENTS[-1]["end"] + 0.8
    proc_dir = OUT_DIR / "processed_segments"
    premix_wav = OUT_DIR / "premix.wav"
    total_samples = int(round(total_runtime * SAMPLE_RATE))
    mix = np.zeros(total_samples, dtype=np.float32)
    for seg in segments:
        seg_wav = proc_dir / f"{seg['id']}.wav"
        with wave.open(str(seg_wav), "rb") as wf:
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
    run(ffmpeg_cmd("-y", "-i", str(premix_wav), "-af", f"highpass=f=60,lowpass=f=16500,acompressor=threshold=-20dB:ratio=1.8:attack=18:release=140:makeup=1.2,loudnorm={VOICE['loudnorm']}", "-ar", str(SAMPLE_RATE), str(FINAL_WAV)))
    run(ffmpeg_cmd("-y", "-i", str(FINAL_WAV), "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", str(SAMPLE_RATE), str(FINAL_MP3)))
    return FINAL_MP3, FINAL_WAV


def ensure_dirs():
    for path in (OUT_DIR, TMP_DIR, OUT_DIR / "raw_segments", OUT_DIR / "processed_segments"):
        path.mkdir(parents=True, exist_ok=True)


def main():
    ensure_dirs()
    token = get_token()
    manifest_segments = []
    for seg in SEGMENTS:
        raw_path = OUT_DIR / "raw_segments" / f"{seg['id']}.wav"
        proc_path = OUT_DIR / "processed_segments" / f"{seg['id']}.wav"
        synthesize_best_fit(token, seg, raw_path)
        process_segment(raw_path, proc_path, seg["end"] - seg["start"])
        manifest_segments.append(
            {
                "id": seg["id"],
                "start": seg["start"],
                "end": seg["end"],
                "processed_duration": round(ffprobe_duration(proc_path), 3),
                "text": seg["text"],
            }
        )
    assemble(SEGMENTS)
    FINAL_SCRIPT.write_text("\n\n".join(s["text"] for s in SEGMENTS) + "\n", encoding="utf-8")
    FINAL_MANIFEST.write_text(json.dumps({
        "voice": VOICE["voice"],
        "label": VOICE["label"],
        "duration_sec": round(ffprobe_duration(FINAL_MP3), 3),
        "segments": manifest_segments,
    }, indent=2), encoding="utf-8")
    print(FINAL_MP3)
    print(FINAL_WAV)
    print(FINAL_SCRIPT)
    print(FINAL_MANIFEST)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
