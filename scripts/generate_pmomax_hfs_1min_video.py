#!/usr/bin/env python3
import base64
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_3MIN = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
SCREENSHOT_DIR = BASE_3MIN / "screenshots"
OUT_DIR = ROOT / "REPORTS" / "hfs_sas_awards_2026"
TMP_DIR = OUT_DIR / "tmp_hfs_1min"
RAW_AUDIO_DIR = TMP_DIR / "raw_audio"
PROC_AUDIO_DIR = TMP_DIR / "proc_audio"
CLIPS_DIR = TMP_DIR / "clips"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
SAMPLE_RATE = 48000
SHOT_DURATION = 6.0
PROJECT = "katalyststreet-public"
GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"

GOOGLE_VOICES = {
    "A": "en-US-Chirp3-HD-Leda",
    "B": "en-US-Chirp3-HD-Fenrir",
}
LOCAL_VOICES = {
    "A": {"voice": "Samantha", "rate": "165"},
    "B": {"voice": "Daniel", "rate": "168"},
}

SHOTS = [
    ("A", "00_landing_overview.png", "Most projects do not start with clean structure. They start with scattered inputs."),
    ("B", "01_workspace_full_demo.png", "P M O Max turns that material into one working project initiation system."),
    ("A", "07_scope_constraints.png", "The platform builds a structured P I D with objectives, scope, constraints, and dependencies."),
    ("B", "10_risks_issues_communications.png", "Risks, communications, governance, and compliance stay visible from the beginning."),
    ("A", "09_people_resources_budget.png", "People, resources, budget, and schedule remain connected to the same project record."),
    ("B", "08_gantt_overview.png", "A live Gantt helps teams move from initiation into executable planning."),
    ("A", "14_ai_assistant_chat.png", "The A I assistant works in the context of the actual project document."),
    ("B", "12_general_notes.png", "Teams can refine content, review gaps, and keep decisions tied to the P I D."),
    ("A", "03_export_panel.png", "Outputs are ready for review in Word, P D F, Jason, and packaged formats."),
    ("B", "04_pid_sections_filled.png", "P M O Max helps teams start projects with more structure, clarity, and accountability."),
]


def run(cmd: list[str], capture_output: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=capture_output, text=True if capture_output else False)


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


def ensure_dirs() -> None:
    for path in (OUT_DIR, TMP_DIR, RAW_AUDIO_DIR, PROC_AUDIO_DIR, CLIPS_DIR):
        path.mkdir(parents=True, exist_ok=True)


def get_token() -> str:
    return run(["gcloud", "auth", "print-access-token"], capture_output=True).stdout.strip()


def synthesize_google(token: str, voice_id: str, text: str, out_path: Path) -> None:
    payload = {
        "input": {
            "ssml": (
                "<speak><prosody rate='0.99'>"
                + text.replace("P M O", "<say-as interpret-as='characters'>PMO</say-as>")
                .replace("P I D", "<say-as interpret-as='characters'>PID</say-as>")
                .replace("A I", "<say-as interpret-as='characters'>AI</say-as>")
                .replace("P D F", "<say-as interpret-as='characters'>PDF</say-as>")
                .replace("Jason", "JSON")
                + "</prosody></speak>"
            )
        },
        "voice": {"languageCode": "en-US", "name": GOOGLE_VOICES[voice_id]},
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
            GOOGLE_TTS_URL,
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


def synthesize_local(voice_id: str, text: str, out_path: Path) -> None:
    spec = LOCAL_VOICES[voice_id]
    aiff_path = out_path.with_suffix(".aiff")
    spoken = (
        text.replace("P M O Max", "P M O Max")
        .replace("P I D", "P. I. D.")
        .replace("A I", "A. I.")
        .replace("P D F", "P. D. F.")
        .replace("Jason", "JAY-sawn")
    )
    run(["say", "-v", spec["voice"], "-r", spec["rate"], "-o", str(aiff_path), spoken])
    run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SAMPLE_RATE}", str(aiff_path), str(out_path)])
    aiff_path.unlink(missing_ok=True)


def atempo_chain(factor: float) -> str:
    parts: list[str] = []
    remaining = factor
    while remaining > 2.0:
        parts.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        parts.append("atempo=0.5")
        remaining /= 0.5
    parts.append(f"atempo={remaining:.6f}")
    return ",".join(parts)


def process_audio(raw_path: Path, proc_path: Path, window: float) -> float:
    raw_duration = ffprobe_duration(raw_path)
    target_max = max(window - 0.15, window * 0.96)
    target_min = window * 0.62
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
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                str(proc_path),
            ]
        )
    elif raw_duration < target_min:
        desired = min(window * 0.72, raw_duration / 0.94)
        factor = raw_duration / desired
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_path),
                "-filter:a",
                atempo_chain(factor),
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                str(proc_path),
            ]
        )
    else:
        run(["ffmpeg", "-y", "-i", str(raw_path), "-ac", "1", "-ar", str(SAMPLE_RATE), str(proc_path)])
    return ffprobe_duration(proc_path)


def srt_timestamp(seconds: float) -> str:
    millis = round(seconds * 1000)
    hrs = millis // 3600000
    millis %= 3600000
    mins = millis // 60000
    millis %= 60000
    secs = millis // 1000
    millis %= 1000
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def build_assets() -> tuple[Path, Path]:
    token = None
    try:
        token = get_token()
    except Exception:
        token = None
    concat_audio = TMP_DIR / "audio_concat.txt"
    concat_video = TMP_DIR / "video_concat.txt"
    srt_path = OUT_DIR / "pmomax_hfs_1min_review.srt"
    srt_blocks: list[str] = []
    audio_entries: list[str] = []
    video_entries: list[str] = []
    spoken_lines: list[str] = []

    current_time = 0.0
    for idx, (voice_id, image_name, text) in enumerate(SHOTS, start=1):
        raw_audio = RAW_AUDIO_DIR / f"{idx:02d}.wav"
        proc_audio = PROC_AUDIO_DIR / f"{idx:02d}.wav"
        clip_path = CLIPS_DIR / f"{idx:02d}.mp4"
        image_path = SCREENSHOT_DIR / image_name
        if token:
            try:
                synthesize_google(token, voice_id, text, raw_audio)
            except Exception:
                synthesize_local(voice_id, text, raw_audio)
        else:
            synthesize_local(voice_id, text, raw_audio)
        duration = process_audio(raw_audio, proc_audio, SHOT_DURATION)
        fade_start = max(SHOT_DURATION - 0.4, 0.1)
        zoom_expr = "zoom+0.00035"
        vf = (
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
            f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,"
            f"zoompan=z='{zoom_expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={int(SHOT_DURATION * FPS)}:s={WIDTH}x{HEIGHT}:fps={FPS},"
            f"format=yuv420p,"
            f"fade=t=in:st=0:d=0.35,"
            f"fade=t=out:st={fade_start:.2f}:d=0.35"
        )
        run(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-i",
                str(image_path),
                "-i",
                str(proc_audio),
                "-t",
                str(SHOT_DURATION),
                "-vf",
                vf,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-r",
                str(FPS),
                "-c:a",
                "aac",
                "-ar",
                str(SAMPLE_RATE),
                "-b:a",
                "192k",
                "-shortest",
                str(clip_path),
            ]
        )
        video_entries.append(f"file '{clip_path.as_posix()}'")
        audio_entries.append(f"file '{proc_audio.as_posix()}'")
        spoken_lines.append(f"{voice_id}: {text}")
        end_caption = current_time + min(duration, SHOT_DURATION - 0.2)
        srt_blocks.append(
            f"{idx}\n{srt_timestamp(current_time)} --> {srt_timestamp(end_caption)}\n{text.replace('P M O', 'PMOMax').replace('P I D', 'PID').replace('A I', 'AI').replace('P D F', 'PDF').replace('Jason', 'JSON')}\n"
        )
        current_time += SHOT_DURATION

    concat_audio.write_text("\n".join(audio_entries) + "\n", encoding="utf-8")
    concat_video.write_text("\n".join(video_entries) + "\n", encoding="utf-8")
    srt_path.write_text("\n".join(srt_blocks).rstrip() + "\n", encoding="utf-8")
    (OUT_DIR / "pmomax_hfs_1min_voiceover_script.txt").write_text("\n".join(spoken_lines) + "\n", encoding="utf-8")

    merged_audio = TMP_DIR / "voiceover.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_audio), "-c", "copy", str(merged_audio)])
    merged_video = OUT_DIR / "pmomax_hfs_1min_review.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_video), "-c", "copy", str(merged_video)])
    return merged_video, srt_path


def main() -> None:
    ensure_dirs()
    video_path, srt_path = build_assets()
    result = {
        "video": str(video_path),
        "subtitles": str(srt_path),
        "duration_seconds": ffprobe_duration(video_path),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
