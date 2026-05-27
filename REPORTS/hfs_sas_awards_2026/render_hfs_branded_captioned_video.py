#!/usr/bin/env python3
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "REPORTS" / "hfs_sas_awards_2026"
LOGO_DIR = ROOT / "public" / "logos"
OVERLAY_DIR = REPORT_DIR / "hfs_1min_caption_logo_overlays"

INPUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_video.mp4"
OUTPUT_VIDEO = REPORT_DIR / "pmomax_hfs_1min_video_captioned_branded.mp4"
PMOMAX_LOGO = LOGO_DIR / "pmomax_logo.png"
KATALYST_LOGO = LOGO_DIR / "katalyst_street_logo_dark.png"

WIDTH = 1920
HEIGHT = 1080
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
BOLD_FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")

CAPTIONS = [
    ("Project initiation usually starts fragmented", "P M O Max brings it into one structured workspace"),
    ("Teams can paste, upload, load a complete demo", "or begin from a guided blank start"),
    ("From raw project material, P M O Max produces", "a complete, editable project initiation document"),
    ("Project information and context are normalized", "for decision-ready review"),
    ("Objectives and key performance indicators stay", "measurable, visible, and consistent"),
    ("Scope, deliverables, constraints, and dependencies", "remain explicit from the start"),
    ("The entire initiation package stays aligned", "in one shared system"),
    ("Planning becomes executable when schedules turn", "into a live Gantt chart"),
    ("Milestones, sequencing, and delivery timing", "become visible at a glance"),
    ("Execution detail stays connected to the initiation", "document that produced it"),
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def resize_logo(path: Path, max_w: int, max_h: int) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    return img


def text_bbox(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    return draw.textbbox(xy, text, font=font)


def draw_centered_text(draw: ImageDraw.ImageDraw, y: int, text: str, font: ImageFont.FreeTypeFont) -> None:
    bbox = text_bbox(draw, (0, 0), text, font)
    tw = bbox[2] - bbox[0]
    x = (WIDTH - tw) // 2
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))


def make_overlay(idx: int, line1: str, line2: str, pmomax: Image.Image, katalyst: Image.Image) -> Path:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    overlay.alpha_composite(pmomax, (32, 28))
    overlay.alpha_composite(katalyst, (WIDTH - katalyst.width - 32, 32))

    font = ImageFont.truetype(str(FONT_PATH), 42)
    bold_font = ImageFont.truetype(str(BOLD_FONT_PATH), 42)

    box_w = 1580
    box_h = 128
    box_x = (WIDTH - box_w) // 2
    box_y = HEIGHT - box_h - 46
    draw.rounded_rectangle(
        (box_x, box_y, box_x + box_w, box_y + box_h),
        radius=18,
        fill=(0, 0, 0, 172),
        outline=(255, 255, 255, 74),
        width=2,
    )

    draw_centered_text(draw, box_y + 22, line1, bold_font if "P M O Max" in line1 else font)
    draw_centered_text(draw, box_y + 72, line2, bold_font if "P M O Max" in line2 else font)

    out = OVERLAY_DIR / f"overlay_{idx:02d}.png"
    overlay.save(out)
    return out


def build_filter(num_overlays: int) -> str:
    current = "[0:v]"
    parts = []
    for i in range(num_overlays):
        inp = f"[{i + 1}:v]"
        out = "[v]" if i == num_overlays - 1 else f"[v{i + 1}]"
        start = i * 6
        end = (i + 1) * 6
        parts.append(f"{current}{inp}overlay=0:0:enable='between(t,{start},{end})'{out}")
        current = out
    return ";".join(parts)


def main() -> None:
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)
    pmomax = resize_logo(PMOMAX_LOGO, 92, 76)
    katalyst = resize_logo(KATALYST_LOGO, 64, 64)
    overlays = [make_overlay(i + 1, a, b, pmomax, katalyst) for i, (a, b) in enumerate(CAPTIONS)]

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(INPUT_VIDEO)]
    for path in overlays:
        cmd.extend(["-loop", "1", "-i", str(path)])
    cmd.extend(
        [
            "-filter_complex", build_filter(len(overlays)),
            "-map", "[v]",
            "-map", "0:a:0",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            "-t", "60",
            str(OUTPUT_VIDEO),
        ]
    )
    run(cmd)
    print(OUTPUT_VIDEO)


if __name__ == "__main__":
    main()
