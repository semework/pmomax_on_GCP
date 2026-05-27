#!/usr/bin/env python3
import json
import os
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "REPORTS" / "pmomax_video_3min_2026-04-24"
SCREENSHOT_DIR = OUT_DIR / "screenshots"
TMP_DIR = OUT_DIR / "tmp_video_build"
RAW_AUDIO_DIR = TMP_DIR / "raw_audio"
PROC_AUDIO_DIR = TMP_DIR / "processed_audio"
CLIPS_DIR = TMP_DIR / "clips"

FPS = 30
WIDTH = 1920
HEIGHT = 1080
SAMPLE_RATE = 48000
SHOT_DURATION = 6.0
OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"
GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
GOOGLE_PROJECT = "katalyststreet-public"

VOICES = {
    "A": {"voice": "Flo (English (US))", "rate": "156"},
    "B": {"voice": "Daniel", "rate": "162"},
    "C": {"voice": "Eddy (English (US))", "rate": "154"},
}
GOOGLE_VOICES = {
    "A": "en-US-Chirp3-HD-Leda",
    "B": "en-US-Chirp3-HD-Fenrir",
    "C": "en-US-Chirp3-HD-Aoede",
}

SHOTS = [
    ("A", "00_landing_overview.png", "Project initiation usually starts fragmented. PMOMax brings it into one structured workspace."),
    ("B", "02_project_controls.png", "Teams can paste, upload, load a complete demo, or begin from a guided blank start."),
    ("A", "04_pid_sections_filled.png", "From raw project material, PMOMax produces a complete, editable PID."),
    ("C", "05_project_info_overview.png", "Project information and context are normalized immediately for decision-ready review."),
    ("A", "06_objectives_kpis.png", "Objectives and KPIs stay measurable, visible, and consistent."),
    ("B", "07_scope_constraints.png", "Scope, deliverables, constraints, and dependencies remain explicit from the start."),
    ("A", "01_workspace_full_demo.png", "The entire initiation package stays aligned in one shared system."),
    ("C", "08_gantt_overview.png", "Planning becomes executable when schedules turn into a live Gantt."),
    ("A", "08_gantt_overview.png", "Milestones, sequencing, and delivery timing become visible at a glance."),
    ("B", "08_gantt_overview.png", "Execution detail stays connected to the initiation document that produced it."),
    ("A", "09_people_resources_budget.png", "People, resources, and budget are tied directly to the plan."),
    ("C", "09_people_resources_budget.png", "That gives delivery teams context for staffing, tooling, and cost tradeoffs."),
    ("A", "10_risks_issues_communications.png", "Risks, issues, and communications are surfaced before execution begins."),
    ("B", "10_risks_issues_communications.png", "Instead of scattered notes, teams review probability, impact, mitigation, and decisions together."),
    ("A", "11_governance_compliance.png", "Governance and compliance stay visible, actionable, and audit-friendly."),
    ("C", "11_governance_compliance.png", "Approvals, security, privacy, and readiness checks are built into the workflow."),
    ("A", "13_ai_assistant_default.png", "The AI assistant works alongside the live PID, not outside it."),
    ("B", "14_ai_assistant_chat.png", "Ask for summaries, rewrites, delivery risks, or compliance gaps in project context."),
    ("A", "14_ai_assistant_chat.png", "The conversation stays connected to the same structured plan your team is executing."),
    ("C", "12_general_notes.png", "General Notes preserve the reasoning, assumptions, and working decisions behind the plan."),
    ("A", "01_workspace_full_demo.png", "Navigation keeps large project documents instantly explorable."),
    ("B", "15_help_modal_open.png", "Built-in help gives teams fast, section-aware guidance when they need it."),
    ("A", "16_user_guide_open.png", "And the user guide supports onboarding without forcing people out of the workflow."),
    ("C", "17_create_mode.png", "When teams want to start from zero, Create mode opens a guided entry point."),
    ("A", "01_workspace_full_demo.png", "When they need to prove value fast, Load Demo shows the end-to-end system immediately."),
    ("B", "03_export_panel.png", "Outputs are ready to move across stakeholders, reviews, and audits."),
    ("A", "03_export_panel.png", "PMOMax supports Word, PDF, JSON, and packaged deliverables from the same workspace."),
    ("C", "04_pid_sections_filled.png", "What changes here is the handoff between planning and execution."),
    ("A", "01_workspace_full_demo.png", "PMOMax turns project initiation into a governed, AI-assisted operating system."),
    ("B", "01_workspace_full_demo.png", "PMOMax. Structure the PID, align the team, and launch with confidence."),
]


def run(cmd: list[str], capture_output: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        check=True,
        capture_output=capture_output,
        text=True if capture_output else False,
    )


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


def write_status(text: str) -> Path:
    status_path = OUT_DIR / "pmomax_promo_3min_build_status.txt"
    status_path.write_text(text.rstrip() + "\n", encoding="utf-8")
    return status_path


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


def synthesize_local(voice_id: str, text: str, out_path: Path) -> None:
    voice = VOICES[voice_id]
    aiff_path = out_path.with_suffix(".aiff")
    run(
        [
            "say",
            "-v",
            voice["voice"],
            "-r",
            voice["rate"],
            "-o",
            str(aiff_path),
            text,
        ]
    )
    run(
        [
            "afconvert",
            "-f",
            "WAVE",
            "-d",
            f"LEI16@{SAMPLE_RATE}",
            str(aiff_path),
            str(out_path),
        ]
    )
    aiff_path.unlink(missing_ok=True)


def synthesize_openai(voice_name: str, text: str, out_path: Path) -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    payload = {
        "model": "gpt-4o-mini-tts",
        "voice": voice_name,
        "response_format": "wav",
        "input": text,
    }
    run(
        [
            "curl",
            "-sS",
            OPENAI_TTS_URL,
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
    if out_path.exists() and out_path.read_bytes().startswith(b"{"):
        try:
            response = json.loads(out_path.read_text(encoding="utf-8"))
            message = response.get("error", {}).get("message", "unknown OpenAI TTS error")
        except Exception:
            message = "unknown OpenAI TTS error"
        raise RuntimeError(message)


def synthesize_google(voice_name: str, text: str, out_path: Path) -> None:
    token = run(["gcloud", "auth", "print-access-token"], capture_output=True).stdout.strip()
    payload = {
        "input": {"ssml": f"<speak><prosody rate='0.98'>{text}</prosody></speak>"},
        "voice": {"languageCode": "en-US", "name": voice_name},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": SAMPLE_RATE},
    }
    run(
        [
            "curl",
            "-sS",
            "-H",
            f"Authorization: Bearer {token}",
            "-H",
            f"x-goog-user-project: {GOOGLE_PROJECT}",
            "-H",
            "Content-Type: application/json",
            GOOGLE_TTS_URL,
            "-d",
            json.dumps(payload),
            "--output",
            str(out_path),
        ]
    )
    if out_path.exists() and out_path.read_bytes().startswith(b"{"):
        try:
            response = json.loads(out_path.read_text(encoding="utf-8"))
            message = response.get("error", {}).get("message", "unknown Google TTS error")
        except Exception:
            message = "unknown Google TTS error"
        raise RuntimeError(message)


def process_segment(raw_path: Path, proc_path: Path, window: float) -> float:
    raw_duration = ffprobe_duration(raw_path)
    max_target = window - 0.25
    min_target = window * 0.58

    if raw_duration > max_target:
        factor = raw_duration / max_target
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
    elif raw_duration < min_target:
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
                "-ac",
                "1",
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
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                str(proc_path),
            ]
        )
    return ffprobe_duration(proc_path)


def srt_time(seconds: float) -> str:
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3_600_000
    total_ms %= 3_600_000
    minutes = total_ms // 60_000
    total_ms %= 60_000
    secs = total_ms // 1000
    ms = total_ms % 1000
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def display_text(text: str) -> str:
    clean = re.sub(r"\s+", " ", text.strip())
    clean = clean.replace("PMOMax.", "PMOMax")
    clean = clean.replace("PMOMax", "PMOMax")
    return clean


def write_srt() -> Path:
    srt_path = OUT_DIR / "pmomax_promo_3min.srt"
    lines = []
    for idx, (_, _, text) in enumerate(SHOTS, start=1):
        start = (idx - 1) * SHOT_DURATION
        end = idx * SHOT_DURATION
        lines.extend(
            [
                str(idx),
                f"{srt_time(start)} --> {srt_time(end)}",
                display_text(text),
                "",
            ]
        )
    srt_path.write_text("\n".join(lines), encoding="utf-8")
    return srt_path


def write_script_manifest(processed_durations: list[float], synth_summary: str) -> Path:
    manifest_path = OUT_DIR / "pmomax_promo_3min_script.txt"
    lines = [
        "PMOMax 3-minute promo video script",
        f"Narration status: {synth_summary}",
        "",
    ]
    for idx, ((voice_id, image, text), duration) in enumerate(zip(SHOTS, processed_durations), start=1):
        start = (idx - 1) * SHOT_DURATION
        end = idx * SHOT_DURATION
        lines.append(
            f"{srt_time(start).replace(',', '.')} - {srt_time(end).replace(',', '.')} | "
            f"Narrator {voice_id} | {image} | {text} | audio={duration:.2f}s"
        )
    manifest_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return manifest_path


def write_shot_csv() -> Path:
    csv_path = OUT_DIR / "pmomax_promo_3min_shots.csv"
    lines = ["index,start,end,narrator,image,text"]
    for idx, (voice_id, image, text) in enumerate(SHOTS, start=1):
        start = (idx - 1) * SHOT_DURATION
        end = idx * SHOT_DURATION
        safe_text = text.replace('"', '""')
        lines.append(f'{idx},{start:.1f},{end:.1f},{voice_id},{image},"{safe_text}"')
    csv_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return csv_path


def build_silent_audio() -> tuple[Path, Path, list[float], str]:
    total_runtime = len(SHOTS) * SHOT_DURATION
    final_wav = OUT_DIR / "pmomax_promo_3min_voiceover.wav"
    final_mp3 = OUT_DIR / "pmomax_promo_3min_voiceover.mp3"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r={SAMPLE_RATE}:cl=mono",
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
    return final_wav, final_mp3, [0.0] * len(SHOTS), "No narration generated; silent guide track created."


def assemble_audio() -> tuple[Path, Path, list[float], str]:
    durations = []
    openai_voices = {"A": "marin", "B": "ash", "C": "sage"}
    synth_summary = "Google TTS"
    try:
        for idx, (voice_id, _, text) in enumerate(SHOTS, start=1):
            raw = RAW_AUDIO_DIR / f"{idx:02}.wav"
            proc = PROC_AUDIO_DIR / f"{idx:02}.wav"
            synthesize_google(GOOGLE_VOICES[voice_id], text, raw)
            durations.append(process_segment(raw, proc, SHOT_DURATION))
    except Exception as google_exc:
        try:
            durations = []
            synth_summary = "OpenAI TTS"
            for idx, (voice_id, _, text) in enumerate(SHOTS, start=1):
                raw = RAW_AUDIO_DIR / f"{idx:02}.wav"
                proc = PROC_AUDIO_DIR / f"{idx:02}.wav"
                synthesize_openai(openai_voices[voice_id], text, raw)
                durations.append(process_segment(raw, proc, SHOT_DURATION))
        except Exception as openai_exc:
            try:
                durations = []
                synth_summary = "macOS say"
                for idx, (voice_id, _, text) in enumerate(SHOTS, start=1):
                    raw = RAW_AUDIO_DIR / f"{idx:02}.wav"
                    proc = PROC_AUDIO_DIR / f"{idx:02}.wav"
                    synthesize_local(voice_id, text, raw)
                    durations.append(process_segment(raw, proc, SHOT_DURATION))
            except Exception as local_exc:
                message = (
                    "Narration generation failed.\n"
                    f"Google TTS error: {google_exc}\n"
                    f"OpenAI TTS error: {openai_exc}\n"
                    f"macOS say error: {local_exc}\n"
                    "Falling back to silent guide track.\n"
                )
                write_status(message)
                return build_silent_audio()

    total_runtime = len(SHOTS) * SHOT_DURATION
    inputs = ["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono"]
    filter_parts = []
    for idx in range(1, len(SHOTS) + 1):
        inputs.extend(["-i", str(PROC_AUDIO_DIR / f"{idx:02}.wav")])
    for idx in range(1, len(SHOTS) + 1):
        delay_ms = int(round((idx - 1) * SHOT_DURATION * 1000))
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")
    mix_inputs = "".join(f"[a{idx}]" for idx in range(1, len(SHOTS) + 1))
    filter_parts.append(
        f"[0:a]{mix_inputs}amix=inputs={len(SHOTS)+1}:normalize=0,"
        "highpass=f=55,lowpass=f=17000,loudnorm=I=-18:LRA=6:TP=-2[out]"
    )

    final_wav = OUT_DIR / "pmomax_promo_3min_voiceover.wav"
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

    final_mp3 = OUT_DIR / "pmomax_promo_3min_voiceover.mp3"
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
    write_status(f"Narration generated successfully with {synth_summary}.\n")
    return final_wav, final_mp3, durations, synth_summary


def clip_motion(idx: int) -> tuple[float, float]:
    variant = idx % 3
    if variant == 1:
        return 1.0, 1.06
    if variant == 2:
        return 1.02, 1.08
    return 1.01, 1.07


def render_clip(idx: int, image_name: str) -> Path:
    image_path = SCREENSHOT_DIR / image_name
    clip_path = CLIPS_DIR / f"clip_{idx:02}.mp4"
    if clip_path.exists():
        return clip_path
    start_zoom, end_zoom = clip_motion(idx)
    zoom_increment = (end_zoom - start_zoom) / (SHOT_DURATION * FPS)
    x_expr = "iw/2-(iw/zoom/2)"
    y_expr = "ih/2-(ih/zoom/2)"
    if idx % 3 == 2:
        x_expr = "iw/2-(iw/zoom/2)-(on*0.20)"
    elif idx % 3 == 0:
        y_expr = "ih/2-(ih/zoom/2)+(on*0.15)"

    filter_graph = (
        f"[0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={WIDTH}:{HEIGHT},gblur=sigma=18[bg];"
        f"[0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,"
        f"zoompan=z='min(max(zoom,{start_zoom:.4f})+{zoom_increment:.7f},{end_zoom:.4f})':"
        f"x='{x_expr}':y='{y_expr}':d={int(SHOT_DURATION * FPS)}:s={WIDTH}x{HEIGHT}:fps={FPS},"
        "format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(image_path),
            "-t",
            f"{SHOT_DURATION:.3f}",
            "-filter_complex",
            filter_graph,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(clip_path),
        ]
    )
    return clip_path


def render_video() -> Path:
    clean_video = OUT_DIR / "pmomax_promo_3min_clean.mp4"
    if clean_video.exists():
        return clean_video
    clips = [render_clip(idx, image) for idx, (_, image, _) in enumerate(SHOTS, start=1)]
    list_path = TMP_DIR / "concat_clips.txt"
    list_path.write_text(
        "\n".join(f"file '{clip.as_posix()}'" for clip in clips) + "\n",
        encoding="utf-8",
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_path),
            "-c",
            "copy",
            str(clean_video),
        ]
    )
    return clean_video


def mux_outputs(clean_video: Path, audio_wav: Path, srt_path: Path) -> tuple[Path, Path]:
    review_video = OUT_DIR / "pmomax_promo_3min_review.mp4"
    captioned_video = OUT_DIR / "pmomax_promo_3min_captioned.mp4"
    subtitle_path = str(srt_path).replace(":", r"\:")
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(clean_video),
            "-i",
            str(audio_wav),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(review_video),
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(review_video),
            "-vf",
            f"subtitles={subtitle_path}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "copy",
            str(captioned_video),
        ]
    )
    return review_video, captioned_video


def main() -> None:
    ensure_dirs()
    audio_wav, _, durations, synth_summary = assemble_audio()
    srt_path = write_srt()
    write_script_manifest(durations, synth_summary)
    write_shot_csv()
    clean_video = render_video()
    review_video, captioned_video = mux_outputs(clean_video, audio_wav, srt_path)
    print(review_video)
    print(captioned_video)
    print(srt_path)


if __name__ == "__main__":
    main()
