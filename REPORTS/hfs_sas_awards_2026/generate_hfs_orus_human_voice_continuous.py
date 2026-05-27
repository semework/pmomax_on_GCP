#!/usr/bin/env python3
import base64
import html
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "REPORTS" / "hfs_sas_awards_2026"
OUT_DIR = REPORT_DIR / "hfs_orus_human_voice_continuous"
TMP_DIR = OUT_DIR / "tmp"

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
    "speaking_rate": 0.88,
    "gain_db": -1.0,
    "pitch": "-0.8st",
    "loudnorm": "I=-18:LRA=7:TP=-2",
}

SPOKEN_LINES = [
    "Project initiation usually starts fragmented. P M O Max brings it into one structured workspace.",
    "Teams can paste, upload, load a complete demo, or begin from a guided blank start.",
    "From raw project material, P M O Max produces a complete, editable project initiation document.",
    "Project information and context are normalized for decision-ready review.",
    "Objectives and key performance indicators stay measurable, visible, and consistent.",
    "Scope, deliverables, constraints, and dependencies remain explicit from the start.",
    "The entire initiation package stays aligned in one shared system.",
    "Planning becomes executable when schedules turn into a live Gantt chart.",
    "Milestones, sequencing, and delivery timing become visible at a glance.",
    "Execution detail stays connected to the initiation document that produced it.",
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


def ssml_text(text: str) -> str:
    escaped = html.escape(text, quote=False)
    escaped = escaped.replace("P M O Max", '<say-as interpret-as="characters">PMO</say-as> Max')
    escaped = escaped.replace("Gantt chart", '<sub alias="gant chart">Gantt chart</sub>')
    return escaped


def build_ssml(lines: list[str]) -> str:
    body = []
    for line in lines:
        body.append(f'<p><s><prosody pitch="{VOICE["pitch"]}" volume="medium">{ssml_text(line)}</prosody></s></p>')
    return "<speak>" + '<break time="260ms"/>'.join(body) + "</speak>"


def synthesize(token: str, lines: list[str], out_path: Path) -> None:
    payload = {
        "input": {"ssml": build_ssml(lines)},
        "voice": {"languageCode": "en-US", "name": VOICE["name"]},
        "audioConfig": {
            "audioEncoding": "LINEAR16",
            "sampleRateHertz": SAMPLE_RATE,
            "speakingRate": VOICE["speaking_rate"],
            "volumeGainDb": VOICE["gain_db"],
        },
    }
    response_path = TMP_DIR / f"{out_path.stem}.json"
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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    if not BACKUP_VIDEO.exists():
        BACKUP_VIDEO.write_bytes(INPUT_VIDEO.read_bytes())

    token = get_token()
    raw = OUT_DIR / "raw_orus.wav"
    cleaned = OUT_DIR / "cleaned_orus.wav"
    fitted = OUT_DIR / "fitted_orus.wav"
    normalized = OUT_DIR / "normalized_orus.wav"
    temp_video = REPORT_DIR / "pmomax_hfs_1min_review_orus_human_tmp.mp4"

    synthesize(token, SPOKEN_LINES, raw)
    run(
        ffmpeg_cmd(
            "-y", "-i", str(raw),
            "-af", "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.03:stop_periods=0",
            "-ar", str(SAMPLE_RATE), str(cleaned)
        )
    )
    natural_duration = ffprobe_duration(cleaned)
    target_voice_duration = 58.8
    tempo_factor = natural_duration / target_voice_duration
    if abs(tempo_factor - 1.0) > 0.025:
        run(ffmpeg_cmd("-y", "-i", str(cleaned), "-filter:a", atempo_chain(tempo_factor), "-ar", str(SAMPLE_RATE), str(fitted)))
    else:
        run(ffmpeg_cmd("-y", "-i", str(cleaned), "-ar", str(SAMPLE_RATE), str(fitted)))

    run(
        ffmpeg_cmd(
            "-y", "-i", str(fitted),
            "-af", f"adelay=250:all=1,apad,atrim=0:60,asetpts=N/SR/TB,highpass=f=65,lowpass=f=16000,acompressor=threshold=-21dB:ratio=1.7:attack=20:release=160:makeup=1.0,loudnorm={VOICE['loudnorm']}",
            "-ar", str(SAMPLE_RATE), str(normalized)
        )
    )
    normalized.replace(FINAL_WAV)
    run(ffmpeg_cmd("-y", "-i", str(FINAL_WAV), "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", str(SAMPLE_RATE), str(FINAL_MP3)))

    source_video = BACKUP_VIDEO
    run(
        ffmpeg_cmd(
            "-y", "-i", str(source_video), "-i", str(FINAL_WAV),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", str(SAMPLE_RATE),
            "-shortest", str(temp_video)
        )
    )
    temp_video.replace(FINAL_VIDEO)

    manifest = {
        "voice": VOICE,
        "mode": "continuous executive narration",
        "natural_voice_duration_sec": round(natural_duration, 3),
        "target_voice_duration_sec": target_voice_duration,
        "tempo_factor": round(tempo_factor, 4),
        "final_video_duration_sec": round(ffprobe_duration(FINAL_VIDEO), 3),
        "final_audio_duration_sec": round(ffprobe_duration(FINAL_WAV), 3),
        "video": str(FINAL_VIDEO.relative_to(ROOT)),
        "backup_video": str(BACKUP_VIDEO.relative_to(ROOT)),
        "wav": str(FINAL_WAV.relative_to(ROOT)),
        "mp3": str(FINAL_MP3.relative_to(ROOT)),
        "notes": [
            "Video stream copied unchanged from original backup",
            "Orus Chirp HD voice used",
            "Continuous narration used for more human cadence than rigid six-second line fitting",
            "PMOMax spoken as P M O Max",
            "PID spoken as project initiation document",
            "KPIs spoken as key performance indicators",
        ],
    }
    FINAL_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    FINAL_SPOKEN_SCRIPT.write_text("\n".join(SPOKEN_LINES) + "\n", encoding="utf-8")

    print(FINAL_VIDEO)
    print(FINAL_WAV)
    print(FINAL_MP3)
    print(FINAL_MANIFEST)
    print(f"final_video_duration={ffprobe_duration(FINAL_VIDEO):.3f}")
    print(f"tempo_factor={tempo_factor:.4f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
