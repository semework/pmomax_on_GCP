# -*- coding: utf-8 -*-
"""
PMOMax Deterministic Fancy Video Builder
======================================

This renderer produces **pixel-faithful** videos from UI screenshots:
- No generative frames (no hallucinated UI text).
- More exciting, cinematic motion than basic Ken Burns:
  - swipe-reveal masks
  - glass reflection overlay (deterministic)
  - punchy "card spring" easing
  - per-scene choreography driven by the manifest order

Audio:
- Always outputs MP4 with an audio track (real audio if available; otherwise silence).
- Supports caching Veo-generated audio-only MP4s and extracting AAC for muxing.

Manifest: clip_manifest.json
- Chronology is exactly the scene order in the manifest.
- Each scene supports:
  img (gs:// or local)
  duration_seconds (int)
  vo (text)  -> used for optional audio generation
  audio (optional gs:// or local) -> used directly if present
  focus (string) -> deterministic crop preset (no fragile auto-cropping)
  style: hero | swipe_cards | kenburns
  motion: dolly_in | pan_left | pan_right | pan_up | pan_down | zoom_in | zoom_out
  choreo: {"preset": "..."}  (optional)

Env
---
Required:
  OUTPUT_LOCAL_DIR

Optional:
  PROJECT_ID                 (for google-cloud-storage downloads)
  LOCATION=us-central1
  MODEL_ID=veo-3.1-generate-001
  MANIFEST_PATH=./clip_manifest.json
  VIDEO_KEYS=30sec,01min,...
  MAX_SCENES=5

Rendering:
  WIDTH=1920
  HEIGHT=1080
  FPS=30

Audio (recommended):
  AUDIO_MODE=auto            # auto | manifest | off | veo | tts
  AUDIO_CACHE_DIR=_audio_cache
  # Use provided scene["audio"] when present. If missing:
  # - AUDIO_MODE=veo: generate Veo clip with generate_audio=True and extract audio
  # - AUDIO_MODE=tts: use Cloud Text-to-Speech (google-cloud-texttospeech)
  # - auto: try veo -> tts -> silence

Veo audio:
  ENABLE_VEO_AUDIO=1         # default 0; if 1 and google-genai is installed, it will run Veo for audio
  OUTPUT_GCS_URI_BASE=gs://.../generated   # required for Veo outputs
  AUDIO_GCS_URI_BASE=gs://.../generated_audio  # optional (defaults to OUTPUT_GCS_URI_BASE + "/audio")
  POLL_SECONDS=15
  DURATION_SECONDS=8         # (4,6,8) for Veo

TTS:
  ENABLE_TTS=1               # default 0; if 1 and package installed, will synthesize mp3 from vo text
  TTS_VOICE=en-US-Neural2-D
  TTS_SPEAKING_RATE=1.0
  TTS_PITCH=0.0

Dependencies
------------
- ffmpeg (required)
- (optional) google-cloud-storage (recommended for GCS downloads)
- (optional) google-genai (Veo audio cache)
- (optional) google-cloud-texttospeech (TTS fallback)
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

# Optional: Veo (audio-only generation)
try:
    from google import genai  # type: ignore
    from google.genai import types  # type: ignore
except Exception:
    genai = None
    types = None

# ----------------------------
# ENV
# ----------------------------
PROJECT_ID = (os.environ.get("PROJECT_ID") or "").strip()
LOCATION = (os.environ.get("LOCATION") or "us-central1").strip()
MODEL_ID = (os.environ.get("MODEL_ID") or "veo-3.1-generate-001").strip()

OUTPUT_LOCAL_DIR = (os.environ.get("OUTPUT_LOCAL_DIR") or "").strip()
MANIFEST_PATH = (os.environ.get("MANIFEST_PATH") or os.path.join(os.path.dirname(__file__), "clip_manifest1.json")).strip()
VIDEO_KEYS_ENV = (os.environ.get("VIDEO_KEYS") or "").strip()
MAX_SCENES_ENV = (os.environ.get("MAX_SCENES") or "").strip()
MAX_SCENES: Optional[int] = int(MAX_SCENES_ENV) if MAX_SCENES_ENV.isdigit() else None

WIDTH = int(os.environ.get("WIDTH", "1920"))
HEIGHT = int(os.environ.get("HEIGHT", "1080"))
FPS = int(os.environ.get("FPS", "30"))

# Audio controls
AUDIO_MODE = (os.environ.get("AUDIO_MODE") or "auto").strip().lower()  # auto|manifest|off|veo|tts
AUDIO_CACHE_DIRNAME = (os.environ.get("AUDIO_CACHE_DIR") or "_audio_cache").strip()

ENABLE_VEO_AUDIO = os.environ.get("ENABLE_VEO_AUDIO", "0") == "1"
OUTPUT_GCS_URI_BASE = (os.environ.get("OUTPUT_GCS_URI_BASE") or "").strip()
AUDIO_GCS_URI_BASE = (os.environ.get("AUDIO_GCS_URI_BASE") or "").strip()
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "15"))
try:
    VEO_DURATION_SECONDS = int(os.environ.get("DURATION_SECONDS", "8"))
except Exception:
    VEO_DURATION_SECONDS = 8

ENABLE_TTS = os.environ.get("ENABLE_TTS", "0") == "1"
TTS_VOICE = (os.environ.get("TTS_VOICE") or "en-US-Neural2-D").strip()
TTS_SPEAKING_RATE = float(os.environ.get("TTS_SPEAKING_RATE", "1.0"))
TTS_PITCH = float(os.environ.get("TTS_PITCH", "0.0"))

DIAG = os.environ.get("DIAG", "0") == "1"

STRICT_PREFIX = (
    "Audio only. Use a neutral studio narrator voice. "
    "No music unless asked. No sound effects unless asked. "
    "No subtitles."
)

# ----------------------------
# TYPES
# ----------------------------
@dataclass
class Box:
    x: int
    y: int
    w: int
    h: int

# ----------------------------
# UTIL
# ----------------------------
def _ffmpeg() -> str:
    ff = shutil.which("ffmpeg")
    if not ff:
        raise RuntimeError("ffmpeg not found on PATH. Install ffmpeg to render videos.")
    return ff

def _ffprobe() -> str:
    fp = shutil.which("ffprobe")
    if not fp:
        raise RuntimeError("ffprobe not found on PATH. Install ffprobe to inspect media.")
    return fp

def mime_for_uri(uri: str) -> str:
    mt, _ = mimetypes.guess_type(uri)
    return mt or "application/octet-stream"

def parse_gs_uri(gs_uri: str) -> Tuple[str, str]:
    if not gs_uri.startswith("gs://"):
        raise ValueError(f"Not a gs:// URI: {gs_uri}")
    rest = gs_uri[5:]
    parts = rest.split("/", 1)
    bucket = parts[0]
    blob = parts[1] if len(parts) > 1 else ""
    return bucket, blob

def download_from_gcs(src: str, dst: str) -> str:
    """Download gs://... to local path. Falls back to gcloud/gsutil if storage lib missing."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not src.startswith("gs://"):
        return src

    # google-cloud-storage (preferred)
    try:
        from google.cloud import storage  # type: ignore
        bucket_name, blob_name = parse_gs_uri(src)
        client = storage.Client(project=PROJECT_ID or None)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(dst)
        return dst
    except Exception:
        pass

    # gcloud
    gcloud = shutil.which("gcloud")
    if gcloud:
        try:
            subprocess.run([gcloud, "storage", "cp", src, dst], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return dst
        except Exception:
            pass

    # gsutil
    gsutil = shutil.which("gsutil")
    if gsutil:
        try:
            subprocess.run([gsutil, "-q", "cp", src, dst], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return dst
        except Exception:
            pass

    raise RuntimeError(f"Failed to download from GCS: {src}")

def load_manifest(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        raise SystemExit(f"Manifest file not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise SystemExit(f"Failed to read/parse manifest JSON: {path}\n{e}")

    if not isinstance(data, dict) or "videos" not in data or not isinstance(data["videos"], dict):
        raise SystemExit("Invalid manifest format: expected top-level object with 'videos' dict.")
    return data

def _read_image_size(path: str) -> Tuple[int, int]:
    # Try Pillow
    try:
        from PIL import Image  # type: ignore
        with Image.open(path) as im:
            return int(im.size[0]), int(im.size[1])
    except Exception:
        pass
    # Fallback to ffprobe
    try:
        out = subprocess.check_output(
            [_ffprobe(), "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path]
        ).decode("utf-8", errors="ignore").strip()
        if "x" in out:
            w, h = out.split("x", 1)
            return int(w), int(h)
    except Exception:
        pass
    return WIDTH, HEIGHT

def _clamp_box(b: Box, img_w: int, img_h: int) -> Box:
    x = max(0, min(int(b.x), max(img_w - 1, 0)))
    y = max(0, min(int(b.y), max(img_h - 1, 0)))
    w = max(2, min(int(b.w), img_w - x))
    h = max(2, min(int(b.h), img_h - y))
    return Box(x=x, y=y, w=w, h=h)

# ----------------------------
# FOCUS PRESETS (deterministic crops)
# ----------------------------
def focus_boxes(focus: str, img_w: int, img_h: int) -> List[Box]:
    f = (focus or "").strip().lower()

    def box_rel(rx: float, ry: float, rw: float, rh: float) -> Box:
        return _clamp_box(Box(int(rx*img_w), int(ry*img_h), int(rw*img_w), int(rh*img_h)), img_w, img_h)

    if f in ("logo_center", "center_logo"):
        return [box_rel(0.18, 0.18, 0.64, 0.64)]
    if f in ("header_logo",):
        return [box_rel(0.0, 0.0, 1.0, 0.34)]
    if f in ("header_logo_center",):
        return [box_rel(0.12, 0.0, 0.76, 0.42)]
    if f in ("top_headline", "top_summary"):
        return [box_rel(0.0, 0.0, 1.0, 0.52)]
    if f in ("hero_center", "hero", "main_panel"):
        return [box_rel(0.06, 0.06, 0.88, 0.88)]
    if f in ("left_nav", "left_nav_mid", "left_nav_tight", "left_nav_sections"):
        return [box_rel(0.00, 0.08, 0.36, 0.84), box_rel(0.36, 0.10, 0.60, 0.78)]
    if f in ("input_panel", "input_parsed"):
        return [box_rel(0.00, 0.06, 0.56, 0.82)]
    if f in ("input_form_lower",):
        return [box_rel(0.00, 0.34, 0.56, 0.60)]
    if f in ("center_body_nav", "center_body"):
        return [box_rel(0.18, 0.12, 0.76, 0.78)]
    if f in ("scope_block",):
        return [box_rel(0.18, 0.18, 0.74, 0.64)]
    if f in ("risks_list", "risks_titles"):
        return [box_rel(0.20, 0.16, 0.74, 0.70)]
    if f in ("people_budget", "budget_figures"):
        return [box_rel(0.12, 0.14, 0.84, 0.72)]
    if f in ("compliance_section", "governance_header"):
        return [box_rel(0.14, 0.14, 0.82, 0.72)]
    if f in ("compliance_top_right", "compliance_right"):
        return [box_rel(0.52, 0.06, 0.46, 0.56)]
    if f in ("chat_messages",):
        return [box_rel(0.42, 0.16, 0.56, 0.68)]
    if f in ("chat_input",):
        return [box_rel(0.42, 0.58, 0.56, 0.34)]
    if f in ("gantt_center",):
        return [box_rel(0.08, 0.18, 0.90, 0.66)]
    if f in ("gantt_left_labels",):
        return [box_rel(0.00, 0.18, 0.46, 0.66)]
    if f in ("gantt_right",):
        return [box_rel(0.46, 0.18, 0.54, 0.66)]
    if f in ("gantt_detail",):
        return [box_rel(0.10, 0.22, 0.86, 0.60)]
    if f in ("help_modal", "user_guide_header", "modal_focus"):
        return [box_rel(0.18, 0.14, 0.68, 0.72)]

    # fallback: center
    return [box_rel(0.12, 0.12, 0.76, 0.76)]

# ----------------------------
# AUDIO
# ----------------------------
def _hash_key(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update((p or "").encode("utf-8", errors="ignore"))
        h.update(b"\0")
    return h.hexdigest()[:20]

def _ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)

def _extract_audio_from_mp4(in_mp4: str, out_m4a: str) -> str:
    """Extract audio track (AAC) if present; else raise."""
    ffmpeg = _ffmpeg()
    _ensure_dir(os.path.dirname(out_m4a))
    # -vn drops video; copy audio when possible
    cmd = [ffmpeg, "-y", "-i", in_mp4, "-vn", "-acodec", "copy", out_m4a]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not os.path.exists(out_m4a) or os.path.getsize(out_m4a) < 2000:
        raise RuntimeError("Audio extraction produced an unexpectedly small file.")
    return out_m4a

def _tts_to_mp3(text: str, out_mp3: str) -> str:
    try:
        from google.cloud import texttospeech  # type: ignore
    except Exception as e:
        raise RuntimeError("google-cloud-texttospeech not installed") from e

    if not text.strip():
        raise RuntimeError("TTS requested but VO text is empty.")

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)

    # Derive language code from voice name (e.g., en-US-Neural2-D)
    lang = "en-US"
    parts = TTS_VOICE.split("-")
    if len(parts) >= 2:
        lang = parts[0] + "-" + parts[1]

    voice = texttospeech.VoiceSelectionParams(language_code=lang, name=TTS_VOICE)
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=TTS_SPEAKING_RATE,
        pitch=TTS_PITCH,
    )

    resp = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    _ensure_dir(os.path.dirname(out_mp3))
    with open(out_mp3, "wb") as f:
        f.write(resp.audio_content)
    return out_mp3

def _require_veo() -> None:
    if genai is None or types is None:
        raise RuntimeError("google-genai not installed/importable.")
    if not OUTPUT_GCS_URI_BASE.startswith("gs://"):
        raise RuntimeError("OUTPUT_GCS_URI_BASE must start with gs:// for Veo audio.")
    if VEO_DURATION_SECONDS not in (4, 6, 8):
        raise RuntimeError("DURATION_SECONDS must be 4, 6, or 8 for Veo.")

def _image_obj_from_gcs(gcs_uri: str):
    return types.Image(gcs_uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))

def _veo_audio_prompt(vo: str) -> str:
    # keep it tight and "audio-only"
    return f"{STRICT_PREFIX}\nVoiceover: \"{vo}\""

def _generate_veo_audio_mp4_cached(scene: Dict[str, Any], scene_dir: str, idx: int, duration: int) -> Optional[str]:
    """
    Generate a Veo MP4 with audio (we will discard video).
    Cache by (img_uri + vo + duration + model_id + voice params) so repeated runs reuse.
    """
    if not ENABLE_VEO_AUDIO:
        return None
    _require_veo()
    vo = (scene.get("vo") or "").strip()
    img = (scene.get("img") or "").strip()
    if not vo or not img or not img.startswith("gs://"):
        return None

    cache_root = os.path.join(OUTPUT_LOCAL_DIR, AUDIO_CACHE_DIRNAME)
    _ensure_dir(cache_root)

    key = _hash_key(img, vo, str(duration), MODEL_ID, LOCATION)
    cached_mp4 = os.path.join(cache_root, f"veo_audio_{key}.mp4")
    cached_m4a = os.path.join(cache_root, f"veo_audio_{key}.m4a")

    if os.path.exists(cached_m4a) and os.path.getsize(cached_m4a) > 2000:
        return cached_m4a

    # If cached mp4 exists, extract audio
    if os.path.exists(cached_mp4) and os.path.getsize(cached_mp4) > 10_000:
        try:
            return _extract_audio_from_mp4(cached_mp4, cached_m4a)
        except Exception:
            pass

    # Generate new
    out_prefix_base = (AUDIO_GCS_URI_BASE or (OUTPUT_GCS_URI_BASE.rstrip("/") + "/audio")).rstrip("/")
    out_prefix = f"{out_prefix_base}/scene_audio/{key}/"

    client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
    prompt = _veo_audio_prompt(vo)
    config = types.GenerateVideosConfig(
        aspect_ratio="16:9",
        duration_seconds=int(duration) if int(duration) in (4, 6, 8) else VEO_DURATION_SECONDS,
        number_of_videos=1,
        output_gcs_uri=out_prefix,
        generate_audio=True,
    )

    op = client.models.generate_videos(model=MODEL_ID, prompt=prompt, image=_image_obj_from_gcs(img), config=config)
    while not getattr(op, "done", False):
        time.sleep(POLL_SECONDS)
        op = client.operations.get(op)

    err = getattr(op, "error", None)
    if err:
        raise RuntimeError(f"Veo audio operation error: {err}")

    uri = None
    resp = getattr(op, "response", None) or getattr(op, "result", None)
    gv = getattr(resp, "generated_videos", None) if resp else None
    if gv and isinstance(gv, list) and gv:
        video = getattr(gv[0], "video", None)
        uri = getattr(video, "uri", None) or getattr(video, "gcs_uri", None)

    if not uri:
        raise RuntimeError("Veo audio: missing output uri in response.")

    # Download mp4 and extract audio
    download_from_gcs(uri, cached_mp4)
    return _extract_audio_from_mp4(cached_mp4, cached_m4a)

def resolve_audio(scene: Dict[str, Any], scene_dir: str, idx: int, duration: int) -> Optional[str]:
    """
    Return a local audio path (m4a/mp3/wav) or None.
    Priority:
      - AUDIO_MODE=manifest: scene["audio"] only
      - AUDIO_MODE=veo: Veo audio cache else scene["audio"]
      - AUDIO_MODE=tts: TTS else scene["audio"]
      - AUDIO_MODE=auto: scene["audio"] -> Veo -> TTS -> None
    """
    audio_ref = scene.get("audio")
    vo = (scene.get("vo") or "").strip()

    def use_manifest() -> Optional[str]:
        if not isinstance(audio_ref, str) or not audio_ref.strip():
            return None
        ref = audio_ref.strip()
        if os.path.exists(ref):
            return ref
        if ref.startswith("gs://"):
            local_dst = os.path.join(scene_dir, f"scene_{idx:02d}_audio" + os.path.splitext(ref)[1])
            got = download_from_gcs(ref, local_dst)
            return got
        return None

    if AUDIO_MODE == "off":
        return None
    if AUDIO_MODE == "manifest":
        return use_manifest()

    if AUDIO_MODE == "veo":
        a = use_manifest()
        if a:
            return a
        try:
            return _generate_veo_audio_mp4_cached(scene, scene_dir, idx, duration)
        except Exception as e:
            if DIAG:
                print(f"  [WARN] Veo audio failed: {e}")
            return None

    if AUDIO_MODE == "tts":
        a = use_manifest()
        if a:
            return a
        if ENABLE_TTS and vo:
            out_mp3 = os.path.join(OUTPUT_LOCAL_DIR, AUDIO_CACHE_DIRNAME, f"tts_{_hash_key(vo, TTS_VOICE, str(duration))}.mp3")
            if os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 2000:
                return out_mp3
            try:
                return _tts_to_mp3(vo, out_mp3)
            except Exception as e:
                if DIAG:
                    print(f"  [WARN] TTS failed: {e}")
        return None

    # auto
    a = use_manifest()
    if a:
        return a
    if ENABLE_VEO_AUDIO:
        try:
            a2 = _generate_veo_audio_mp4_cached(scene, scene_dir, idx, duration)
            if a2:
                return a2
        except Exception as e:
            if DIAG:
                print(f"  [WARN] Veo audio failed: {e}")
    if ENABLE_TTS and vo:
        try:
            out_mp3 = os.path.join(OUTPUT_LOCAL_DIR, AUDIO_CACHE_DIRNAME, f"tts_{_hash_key(vo, TTS_VOICE, str(duration))}.mp3")
            if os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 2000:
                return out_mp3
            return _tts_to_mp3(vo, out_mp3)
        except Exception as e:
            if DIAG:
                print(f"  [WARN] TTS failed: {e}")
    return None

# ----------------------------
# ANIMATION FILTERS
# ----------------------------
def _bg_base_align() -> str:
    # keep screenshot pixels; fit into WIDTHxHEIGHT with pad
    return f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1"

def _bg_motion_crop(motion: str, duration: int) -> str:
    m = (motion or "dolly_in").strip().lower()
    # render at slightly larger size then crop back
    s = 1.10 if m in ("dolly_in", "zoom_in", "slow_dolly_in") else 1.06
    pan = 20.0
    tdiv = max(float(duration), 0.01)
    if m == "pan_left":
        x = f"(iw-ow)/2 + {pan}*(1 - t/{tdiv})"
        y = "(ih-oh)/2"
    elif m == "pan_right":
        x = f"(iw-ow)/2 - {pan}*(1 - t/{tdiv})"
        y = "(ih-oh)/2"
    elif m == "pan_up":
        x = "(iw-ow)/2"
        y = f"(ih-oh)/2 + {pan}*(1 - t/{tdiv})"
    elif m == "pan_down":
        x = "(iw-ow)/2"
        y = f"(ih-oh)/2 - {pan}*(1 - t/{tdiv})"
    else:
        x = f"(iw-ow)/2 + {pan}*sin(2*PI*t/6)"
        y = f"(ih-oh)/2 + {pan}*cos(2*PI*t/7)"
    return f"scale=trunc(iw*{s}):trunc(ih*{s}),crop={WIDTH}:{HEIGHT}:x='{x}':y='{y}',setsar=1"

def _glass_reflection(duration: int) -> str:
    """
    Build a deterministic glass reflection stream sized WIDTHxHEIGHT.
    Uses a diagonal soft gradient band drifting slowly.
    """
    # a faint diagonal band that moves across time
    # Using geq to compute alpha; then blur.
    # Note: expression uses X, Y, W, H and t.
    band = (
        "format=rgba,"
        "geq=r='255':g='255':b='255':"
        "a='"
        "  18*exp(-pow((X+Y - (W*0.2))/(W*0.18),2))"
        " +12*exp(-pow((X+Y - (W*0.75))/(W*0.22),2))"
        "'"
        ",gblur=sigma=8"
    )
    return f"color=color=white@0.0:size={WIDTH}x{HEIGHT}:rate={FPS},trim=duration={duration},{band}"

def _enable_between(start: float, end: float) -> str:
    return f"between(t\\,{start:.3f}\\,{end:.3f})"

def build_filter_complex(
    img_w: int,
    img_h: int,
    duration: int,
    style: str,
    motion: str,
    focus: str,
) -> str:
    """
    Returns filter_complex that:
    - aligns screenshot pixels to WIDTHxHEIGHT
    - applies background parallax
    - creates 1-2 focus "cards" with swipe reveal + spring pop + shadow
    - overlays glass reflection
    """
    style = (style or "swipe_cards").strip().lower()
    boxes = focus_boxes(focus, img_w, img_h)
    # Use at most 2 cards for readability (avoid ugly crops)
    boxes = boxes[:2] if boxes else []

    parts: List[str] = []
    # Align once
    parts.append(f"[0:v]{_bg_base_align()}[align]")
    # Background motion
    parts.append(f"[align]{_bg_motion_crop(motion, duration)}[bg]")

    base = "[bg]"

    if style in ("hero", "kenburns"):
        # Hero: just a clean drift + reflection + slight vignette
        parts.append(f"{base}vignette=PI/8:mode=forward[bg2]")
        base = "[bg2]"
    else:
        # Split for crops
        n = max(1, len(boxes))
        if n == 1:
            parts.append("[align]split=2[src0][src1]")
            crop_sources = ["[src1]"]
            # Connect unused split output to nullsink
            parts.append("[src0]nullsink")
        else:
            parts.append(f"[align]split={n+1}[src0]" + "".join([f"[src{i+1}]" for i in range(n)]))
            crop_sources = [f"[src{i+1}]" for i in range(n)]
            # Connect unused split output to nullsink
            parts.append("[src0]nullsink")

        # Card choreography: 2 phases inside the scene timeline
        total = max(float(duration), 0.1)
        seg = total / max(n, 1)
        for i, b in enumerate(boxes):
            start = i * seg + 0.15
            end = min(total, (i + 1) * seg + 0.05)
            reveal_dur = min(0.9, max(0.5, seg * 0.38))

            # Spring scale (overshoot then settle)
            # s(t) = 1 + A*exp(-k*t)*sin(w*t)
            # where t0 = t - start
            A = 0.10 if i == 0 else 0.08
            k = 7.0
            w = 18.0
            spring = f"(1+{A}*exp(-{k}*(t-{start:.3f}))*sin({w}*(t-{start:.3f})))"
            spring = f"if(gte(t\\,{start:.3f})\\,{spring}\\,1)"

            # Swipe reveal from left (width grows)
            # Use a valid ffmpeg crop width expression: avoid iw in w=, use 'in_w' if supported, else fallback to static width
            # Fallback: just use full width (no swipe) if dynamic is not supported
            # For now, use static width to avoid ffmpeg crop errors
            swipe_w = f"{b.w}"

            # Float position
            fx = f"(W-w)/2 + {24+6*i}*sin(2*PI*t/4 + {i})"
            fy = f"(H-h)/2 + {18+5*i}*cos(2*PI*t/5 + {i})"

            # Crop card from source, then swipe crop, then spring scale, then slight tilt
            parts.append(
                f"{crop_sources[i]}crop={b.w}:{b.h}:{b.x}:{b.y},"
                f"format=rgba,"
                f"crop=w='{swipe_w}':h=ih:x=0:y=0,"
                f"scale=w='iw*{spring}':h='ih*{spring}':eval=frame,"
                f"rotate=angle='0.010*sin(2*PI*t/6)':c=black@0[card{i}]"
            )
            parts.append(f"[card{i}]split=2[card{i}a][card{i}b]")
            parts.append(f"[card{i}a]colorchannelmixer=aa=0.55,boxblur=14:1[shadow{i}]")

            # overlay shadow then card, enabled between start/end
            parts.append(
                f"{base}[shadow{i}]overlay=x='{fx}+6':y='{fy}+10':enable='{_enable_between(start, end)}'[tmp_s{i}]"
            )
            parts.append(
                f"[tmp_s{i}][card{i}b]overlay=x='{fx}':y='{fy}':enable='{_enable_between(start, end)}'[tmp{i}]"
            )
            base = f"[tmp{i}]"

        # subtle vignette at end
        parts.append(f"{base}vignette=PI/7:mode=forward[bg2]")
        base = "[bg2]"

    # Glass reflection overlay (screen-ish blend)
    parts.append(f"{_glass_reflection(duration)}[refl]")
    parts.append(f"{base}[refl]blend=all_mode=screen:all_opacity=0.10[vpre]")

    parts.append("[vpre]format=yuv420p[vout]")
    return ";".join(parts)

# ----------------------------
# RENDER
# ----------------------------
def render_scene(scene: Dict[str, Any], video_key: str, idx: int) -> str:
    ffmpeg = _ffmpeg()

    scene_dir = os.path.join(OUTPUT_LOCAL_DIR, video_key, f"scene_{idx:02d}")
    os.makedirs(scene_dir, exist_ok=True)

    img_uri = str(scene["img"]).strip()
    img_ext = os.path.splitext(img_uri)[1] or ".png"
    local_img = os.path.join(scene_dir, "frame" + img_ext)

    if img_uri.startswith("gs://"):
        local_img = download_from_gcs(img_uri, local_img)
    else:
        if not os.path.exists(img_uri):
            raise RuntimeError(f"Image path not found: {img_uri}")
        local_img = img_uri

    duration = int(scene.get("duration_seconds") or 6)
    style = str(scene.get("style") or "swipe_cards").strip().lower()
    motion = str(scene.get("motion") or "dolly_in").strip().lower()
    focus = str(scene.get("focus") or "center").strip().lower()

    img_w, img_h = _read_image_size(local_img)
    filt = build_filter_complex(img_w, img_h, duration, style, motion, focus)

    audio_path = resolve_audio(scene, scene_dir, idx, duration)

    out_path = os.path.join(scene_dir, "output.mp4")

    cmd: List[str] = [ffmpeg, "-y"]
    cmd += ["-loop", "1", "-t", str(duration), "-i", local_img]

    have_audio = False
    if AUDIO_MODE != "off" and audio_path:
        cmd += ["-i", audio_path]
        have_audio = True
    elif AUDIO_MODE != "off":
        cmd += ["-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]

    cmd += ["-filter_complex", filt]
    cmd += ["-map", "[vout]"]
    if AUDIO_MODE != "off":
        cmd += ["-map", "1:a"]

    cmd += ["-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p"]

    if AUDIO_MODE != "off":
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]

    cmd += ["-movflags", "faststart", out_path]

    if DIAG:
        print("\nFFMPEG CMD:\n", " ".join(cmd))
        print("\nFILTER_COMPLEX:\n", filt)

    subprocess.run(cmd, check=True)

    if not os.path.exists(out_path) or os.path.getsize(out_path) < 50_000:
        raise RuntimeError("Render produced an unexpectedly small output; check ffmpeg logs.")

    # If user expects audio but it's silence, the container will still include an audio stream.
    return out_path

def concat_scenes(video_key: str, scene_count: int) -> str:
    ffmpeg = _ffmpeg()
    concat_dir = os.path.join(OUTPUT_LOCAL_DIR, video_key)
    os.makedirs(concat_dir, exist_ok=True)

    filelist_path = os.path.join(concat_dir, "filelist.txt")
    paths: List[str] = []
    for i in range(1, scene_count + 1):
        p = os.path.join(concat_dir, f"scene_{i:02d}", "output.mp4")
        if os.path.exists(p):
            paths.append(p)

    if not paths:
        raise RuntimeError(f"No rendered scene videos found to concat for {video_key}")

    with open(filelist_path, "w", encoding="utf-8") as f:
        for p in paths:
            f.write(f"file '{p}'\n")

    out_full = os.path.join(concat_dir, f"{video_key}_full.mp4")
    # Stream copy first; fallback to re-encode
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", filelist_path, "-c", "copy", out_full]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        cmd2 = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", filelist_path,
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "faststart", out_full]
        subprocess.run(cmd2, check=True)

    return out_full

def diagnostics() -> None:
    print("Diagnostics:")
    print(f"  MANIFEST_PATH={MANIFEST_PATH}")
    print(f"  OUTPUT_LOCAL_DIR={OUTPUT_LOCAL_DIR}")
    print(f"  VIDEO_KEYS_ENV={VIDEO_KEYS_ENV or '(all)'}")
    print(f"  MAX_SCENES={MAX_SCENES}")
    print(f"  WIDTHxHEIGHT={WIDTH}x{HEIGHT} @ {FPS}fps")
    print(f"  AUDIO_MODE={AUDIO_MODE} ENABLE_VEO_AUDIO={ENABLE_VEO_AUDIO} ENABLE_TTS={ENABLE_TTS}")
    print(f"  ffmpeg present: {'yes' if bool(shutil.which('ffmpeg')) else 'no'}")
    print(f"  genai present: {'yes' if genai is not None else 'no'}")

def main() -> None:
    if not OUTPUT_LOCAL_DIR:
        raise SystemExit("Missing required env var: OUTPUT_LOCAL_DIR")
    manifest = load_manifest(MANIFEST_PATH)

    if VIDEO_KEYS_ENV:
        keys = [k.strip() for k in VIDEO_KEYS_ENV.split(",") if k.strip()]
    else:
        keys = list(manifest.get("videos", {}).keys())

    if DIAG:
        diagnostics()

    for key in keys:
        scenes_all = manifest["videos"][key]["scenes"]
        scenes = scenes_all[:MAX_SCENES] if (MAX_SCENES and MAX_SCENES > 0) else scenes_all

        print(f"\n=== {key}: {len(scenes)} scenes (deterministic fancy) ===")
        rendered = 0
        for i, scene in enumerate(scenes, start=1):
            try:
                out = render_scene(scene, key, i)
                rendered += 1
                print(f"  Scene {i:02d}: OK -> {out}")
            except Exception as e:
                print(f"  Scene {i:02d}: ERROR: {e}")

        if rendered:
            try:
                out_full = concat_scenes(key, len(scenes))
                print(f"[OK] Final: {out_full}")
            except Exception as e:
                print(f"[WARN] Concat failed: {e}")

if __name__ == "__main__":
    main()
