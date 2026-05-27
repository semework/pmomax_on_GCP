#!/usr/bin/env python3
"""
PMOMax Product Video Narration Generator — v2
Voice:   en-US-AriaNeural (expressive, cinematic, promotional US female)
Style:   advertisement_upbeat @ 0.55 degree — energetic but restrained
Timing:  gap-aware trim — each segment can run to the NEXT segment's start
         minus a 300ms safety buffer (fixes cut words like "budget")
Changes vs v1:
  - AriaNeural replaces JennyNeural → more cinematic, promotional feel
  - Rate -7% (slightly brisker, more alive) vs -13% (too reserved)
  - Pitch +3Hz (brighter, more engaging) vs -4Hz (too flat)
  - Trim logic: gap_to_next_start - 300ms, not end_s - start_s
  - JSON → "Jason" (natural spoken word, not spelled out)
Output: pmomax_narration_v2.mp3 + pmomax_narration_v2.wav + script_v2.txt
"""

import asyncio, tempfile, pathlib, os, subprocess, sys, json, re

try:
    import edge_tts
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"], check=True)
    import edge_tts

try:
    from pydub import AudioSegment
    from pydub.effects import normalize
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "pydub"], check=True)
    from pydub import AudioSegment
    from pydub.effects import normalize

OUT_DIR = pathlib.Path(
    "/Users/mulugetasemework/Library/Mobile Documents/"
    "com~apple~CloudDocs/projects/PMO/pmo26"
)
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Voice ─────────────────────────────────────────────────────────────────────
# AriaNeural: Microsoft's most expressive US female — natural, warm, cinematic
# rate/pitch passed natively to Communicate (SSML wrapping caused literal tag readback)
VOICE       = "en-US-AriaNeural"
RATE        = "-7%"    # slightly brisker — feels alive and confident
PITCH       = "+3Hz"   # brighter, more engaging, still professional
SAMPLE_RATE = 44100
TOTAL_S     = 107.0    # total track duration (2s tail after final word)

# ── Segments (start_s, end_s, display_text, tts_text) ────────────────────────
# Pronunciation guide:
#   PMOMax  → "P.M.O. Max"    periods force letter-by-letter reading
#   PID     → "P.I.D."
#   PDF     → "P.D.F."
#   JSON    → "Jason"          natural spoken form, not spelled out
#   PNG     → "P.N.G."
#   JPEG    → "J-PEG"          natural spoken form
#   SVG     → "S.V.G."
#   Gantt   → "Gant" (default)

SEGMENTS = [
    (
        2.1,  9.0,
        "projects fail long before delivery begins",
        "projects fail long before delivery begins",
    ),
    (
        10.2, 14.6,
        "the cause is almost always weak initiation",
        "the cause is almost always weak initiation",
    ),
    (
        17.0, 22.2,
        "start with raw inputs",
        "start with raw inputs",
    ),
    (
        25.8, 30.2,
        "PMOMax structures them instantly",
        "P.M.O. Max structures them instantly",
    ),
    (
        33.8, 37.6,
        "you get a complete PID",
        "you get a complete P.I.D.",
    ),
    (
        41.0, 46.4,
        "governance and compliance are built in",
        "governance and compliance are built in",
    ),
    (
        48.8, 53.8,
        "risks stay visible and actionable",
        "risks stay visible and actionable",
    ),
    (
        57.6, 63.0,
        "people resources and budget are tracked together",
        "people, resources, and budget are tracked together",
    ),
    (
        64.2, 69.2,
        "ask the assistant for precise answers",
        "ask the assistant for precise answers",
    ),
    (
        70.4, 74.4,
        "everything stays connected",
        "everything stays connected",
    ),
    (
        74.6, 78.2,
        "planning becomes executable",
        "planning becomes executable",
    ),
    (
        78.6, 85.8,
        "export the structured project in PDF, Word, or Jason format",
        "export the structured project in P.D.F., Word, or Jason format,",
    ),
    (
        86.0, 93.2,
        "with the Gantt chart seamlessly embedded in the PDF",
        "with the Gantt chart seamlessly embedded in the P.D.F.",
    ),
    (
        93.4, 100.0,
        "and also available as PNG, jay-peg, or S V G",
        "and also available as P.N.G., J-PEG, or S.V.G.",
    ),
    (
        100.2, 104.4,
        "PMOMax. start projects correctly. every time.",
        "P.M.O. Max. start projects correctly. every time.",
    ),
]

# ── TTS synthesis ─────────────────────────────────────────────────────────────
async def synthesize(tts_text: str, out_path: str) -> None:
    comm = edge_tts.Communicate(
        text=tts_text, voice=VOICE, rate=RATE, pitch=PITCH
    )
    await comm.save(out_path)


async def generate_all(tmp_dir: str):
    tasks, paths = [], []
    for i, (s, e, _disp, tts) in enumerate(SEGMENTS):
        p = os.path.join(tmp_dir, f"seg_{i:02d}.mp3")
        paths.append((s, e, p))
        tasks.append(synthesize(tts, p))
    print(f"Generating {len(tasks)} segments — AriaNeural, rate={RATE}, pitch={PITCH} …")
    await asyncio.gather(*tasks)
    print("  done.")
    return paths


# ── Gap-aware trim ─────────────────────────────────────────────────────────────
def max_duration_ms(seg_idx: int, seg_info: list) -> int:
    """
    How long can segment[seg_idx] run before it would clash with the next
    segment's speech start?  Returns a millisecond limit.

    Rule: next_segment_start_ms - this_segment_start_ms - 300ms safety gap.
    For the final segment, allow it to run to TOTAL_S.
    """
    this_start_ms = int(seg_info[seg_idx][0] * 1000)
    if seg_idx < len(seg_info) - 1:
        next_start_ms = int(seg_info[seg_idx + 1][0] * 1000)
        return next_start_ms - this_start_ms - 300
    else:
        return int(TOTAL_S * 1000) - this_start_ms


# ── Assembly ──────────────────────────────────────────────────────────────────
def assemble(seg_info: list) -> AudioSegment:
    base = AudioSegment.silent(duration=int(TOTAL_S * 1000), frame_rate=SAMPLE_RATE)

    for i, (start_s, _end_s, seg_path) in enumerate(seg_info):
        if not os.path.exists(seg_path) or os.path.getsize(seg_path) == 0:
            print(f"  WARN: missing {seg_path}")
            continue

        seg      = AudioSegment.from_file(seg_path)
        seg      = seg.set_frame_rate(SAMPLE_RATE).set_channels(1)
        seg_ms   = len(seg)
        limit_ms = max_duration_ms(i, seg_info)

        if seg_ms > limit_ms:
            seg = seg[:limit_ms - 80].fade_out(80)
            status = f"[trim {seg_ms}→{limit_ms}ms  gap-limit]"
        else:
            status = f"[ok   {seg_ms}ms  gap={limit_ms}ms]"

        seg = normalize(seg)
        base = base.overlay(seg, position=int(start_s * 1000))
        print(f"  seg {i:02d} @{start_s:5.1f}s  {status}")

    return base


# ── Loudnorm ──────────────────────────────────────────────────────────────────
def loudnorm(inp: str, out: str) -> None:
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", inp,
         "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True
    )
    m = re.search(r'\{[^{}]+\}', r.stderr, re.DOTALL)
    if m:
        s = json.loads(m.group())
        subprocess.run(
            ["ffmpeg", "-y", "-i", inp,
             "-af", (
                 f"loudnorm=I=-16:TP=-1.5:LRA=11"
                 f":measured_I={s['input_i']}"
                 f":measured_TP={s['input_tp']}"
                 f":measured_LRA={s['input_lra']}"
                 f":measured_thresh={s['input_thresh']}"
                 f":offset={s['target_offset']}"
                 f":linear=true"
             ),
             "-ar", str(SAMPLE_RATE), "-ac", "1", out],
            capture_output=True, check=True
        )
        print("  Loudnorm: 2-pass EBU R128  I=-16 LUFS / TP=-1.5 / LRA=11")
    else:
        subprocess.run(
            ["ffmpeg", "-y", "-i", inp,
             "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
             "-ar", str(SAMPLE_RATE), "-ac", "1", out],
            capture_output=True, check=True
        )
        print("  Loudnorm: 1-pass fallback")


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    with tempfile.TemporaryDirectory() as tmp:
        seg_info  = await generate_all(tmp)

        print("Assembling timeline …")
        assembled = assemble(seg_info)
        print(f"  Total: {len(assembled)/1000:.1f}s")

        raw_wav = os.path.join(tmp, "raw.wav")
        assembled.export(raw_wav, format="wav",
                         parameters=["-ar", str(SAMPLE_RATE), "-ac", "1"])

        final_wav = str(OUT_DIR / "pmomax_narration_v2.wav")
        final_mp3 = str(OUT_DIR / "pmomax_narration_v2.mp3")

        print("Mastering …")
        loudnorm(raw_wav, final_wav)

        subprocess.run(
            ["ffmpeg", "-y", "-i", final_wav,
             "-codec:a", "libmp3lame", "-b:a", "192k",
             "-ar", str(SAMPLE_RATE), "-ac", "1", final_mp3],
            capture_output=True, check=True
        )

    # Script file
    script_path = str(OUT_DIR / "pmomax_narration_v2_script.txt")
    with open(script_path, "w") as f:
        f.write("PMOMax Product Video — Narration v2\n")
        f.write("Voice: en-US-AriaNeural | Style: advertisement_upbeat 0.55\n")
        f.write("Rate: -7% | Pitch: +3Hz | Master: EBU R128 I=-16 LUFS\n")
        f.write("=" * 58 + "\n\n")
        for start_s, end_s, disp, tts in SEGMENTS:
            m0, s0 = divmod(start_s, 60)
            m1, s1 = divmod(end_s,   60)
            f.write(f"[{int(m0):02d}:{s0:04.1f} – {int(m1):02d}:{s1:04.1f}]\n")
            f.write(f"{disp}\n")
            f.write(f"  (spoken as: {tts})\n\n")

    print(f"\nDone.")
    print(f"  MP3 → {final_mp3}")
    print(f"  WAV → {final_wav}")
    print(f"  TXT → {script_path}")


asyncio.run(main())
