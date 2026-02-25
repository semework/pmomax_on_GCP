# -*- coding: utf-8 -*-
"""
PMOMax Veo video generator (Vertex AI + google-genai)

Fixes:
- Robust operation polling + URI extraction (handles SDK variants and errors)
- No invalid/empty `video` chaining (falls back to image->video if prior clip missing)
- Strict UI fidelity prompting (prompt/negative prompt; Veo 3 enforces prompt enhancement)
- Audio continuity: generate_audio=True on every call; VO labeled as `Voiceover says: "..."` (no subtitles)

Env required:
  PROJECT_ID
  OUTPUT_GCS_URI_BASE   (gs://... base folder where Veo writes outputs)
  OUTPUT_LOCAL_DIR

Optional:
  LOCATION (default: us-central1)
  MODEL_ID (default: veo-3.1-generate-001)
  MANIFEST_PATH (default: ./clip_manifest.json)
  VIDEO_KEYS (comma-separated keys to run)
  MAX_SCENES (int; limit scenes per set for quick tests)
  ONLY_CONCAT=1 (skip generation, only concat existing downloads)
  ASPECT_RATIO (default 16:9)
  DURATION_SECONDS (4,6,8; default 8)
  POLL_SECONDS (default 15)
  RESOLUTION (default 1080p)
  GENERATE_AUDIO (default 1)
  USE_VIDEO_EXTENSION (default 0)
  USE_IMAGE_GROUNDING_IN_EXTENSION (default 0; currently ignored because Veo rejects image+video together)
  DIAG=1
"""
import os
import time
import json
import mimetypes
import shutil
import subprocess
from typing import Dict, List, Any, Optional, Tuple

# Load .env if present (optional)
try:
    from dotenv import load_dotenv  # type: ignore
    _dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(_dotenv_path):
        load_dotenv(_dotenv_path)
except Exception:
    pass

import google.auth
from google.auth.exceptions import DefaultCredentialsError

from google import genai
from google.genai import types


# ----------------------------
# ENV CONFIG
# ----------------------------
PROJECT_ID = (os.environ.get("PROJECT_ID") or "").strip()
LOCATION = (os.environ.get("LOCATION") or "us-central1").strip()
MODEL_ID = (os.environ.get("MODEL_ID") or "veo-3.1-generate-001").strip()

OUTPUT_GCS_URI_BASE = (os.environ.get("OUTPUT_GCS_URI_BASE") or "").strip()
OUTPUT_LOCAL_DIR = (os.environ.get("OUTPUT_LOCAL_DIR") or "").strip()

ASPECT_RATIO = (os.environ.get("ASPECT_RATIO") or "16:9").strip()
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "15"))
DIAG = os.environ.get("DIAG", "0") == "1"

RESOLUTION = (os.environ.get("RESOLUTION") or "1080p").strip()
GENERATE_AUDIO = os.environ.get("GENERATE_AUDIO", "1") != "0"  # default ON

# IMPORTANT defaults for UI fidelity:
# - USE_VIDEO_EXTENSION=0 (default): each scene is generated from its screenshot only.
#   This is the most reliable way to prevent "fake" UI frames with gibberish text.
# - If you explicitly want temporal continuity, set USE_VIDEO_EXTENSION=1.
#   When enabled, we will condition on the previous scene video, and we will NEVER
#   set both image and video in the same request (Vertex will reject it).
USE_VIDEO_EXTENSION = os.environ.get("USE_VIDEO_EXTENSION", "0") != "0"

# If USE_VIDEO_EXTENSION=1, you may additionally set USE_IMAGE_GROUNDING_IN_EXTENSION=1
# to *request* image grounding during extension, but Vertex rejects image+video together
# for this model, so this flag is kept for compatibility/logging only and is forced off.
USE_IMAGE_GROUNDING_IN_EXTENSION = os.environ.get("USE_IMAGE_GROUNDING_IN_EXTENSION", "0") != "0"

MANIFEST_PATH = (
    os.environ.get("MANIFEST_PATH")
    or os.path.join(os.path.dirname(__file__), "clip_manifest.json")
).strip()

MAX_SCENES_ENV = (os.environ.get("MAX_SCENES") or "").strip()
MAX_SCENES: Optional[int] = int(MAX_SCENES_ENV) if MAX_SCENES_ENV.isdigit() else None

try:
    DURATION_SECONDS = int(os.environ.get("DURATION_SECONDS", "8"))
except Exception:
    DURATION_SECONDS = -1

STRICT_PREFIX = (
    "STRICT UI FIDELITY: The reference image is the ground-truth screenshot. "
    "Do NOT redraw, regenerate, or reinterpret the UI. Preserve all pixels, "
    "layout, text, icons, and spacing exactly as-is. No typos. No substitutions. "
    "Static UI elements only; camera motion only. No people, no reflections, "
    "no new objects, no added overlays."
)

NEGATIVE_PROMPT = (
    "typos, misspellings, altered UI text, changed icons, new UI elements, "
    "people, faces, reflections, glare, mirrored text, warped text, melting UI, "
    "extra buttons, random labels"
)


# ----------------------------
# VALIDATION / AUTH
# ----------------------------
def require_env() -> None:
    missing: List[str] = []
    if not PROJECT_ID:
        missing.append("PROJECT_ID")
    if not OUTPUT_GCS_URI_BASE:
        missing.append("OUTPUT_GCS_URI_BASE")
    if not OUTPUT_LOCAL_DIR:
        missing.append("OUTPUT_LOCAL_DIR")

    if missing:
        raise SystemExit("Missing required env vars: " + ", ".join(missing))

    if not OUTPUT_GCS_URI_BASE.startswith("gs://"):
        raise SystemExit("OUTPUT_GCS_URI_BASE must start with 'gs://'")

    if DURATION_SECONDS not in (4, 6, 8):
        raise SystemExit("DURATION_SECONDS must be 4, 6, or 8")


def ensure_adc_or_die() -> None:
    """Fail fast with a clear message if Application Default Credentials are missing."""
    try:
        google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    except DefaultCredentialsError:
        print("\nADC not found. Use --no-browser to avoid web auth issues.")
        raise SystemExit(
            "\nERROR: Application Default Credentials (ADC) not found.\n\n"
            "Do ONE of these, then re-run:\n"
            "  gcloud auth application-default login --no-browser "
            "--scopes=https://www.googleapis.com/auth/cloud-platform\n"
            "  OR\n"
            "  export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account.json'\n"
        )


# ----------------------------
# MANIFEST LOADING
# ----------------------------
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

    # Minimal validation
    for key, v in data["videos"].items():
        if not isinstance(v, dict) or "scenes" not in v or not isinstance(v["scenes"], list) or not v["scenes"]:
            raise SystemExit(f"Invalid manifest: video '{key}' must have non-empty 'scenes' list.")
        for idx, scene in enumerate(v["scenes"], start=1):
            if not isinstance(scene, dict):
                raise SystemExit(f"Invalid scene object in '{key}' at index {idx}.")
            if not scene.get("img") or not isinstance(scene["img"], str):
                raise SystemExit(f"Scene missing 'img' in '{key}' at index {idx}.")
            if not scene.get("prompt") or not isinstance(scene["prompt"], str):
                raise SystemExit(f"Scene missing 'prompt' in '{key}' at index {idx}.")
            if "vo" in scene and scene["vo"] is not None and not isinstance(scene["vo"], str):
                raise SystemExit(f"Scene 'vo' must be string in '{key}' at index {idx}.")
    return data


# ----------------------------
# HELPERS
# ----------------------------
def mime_for_uri(uri: str) -> str:
    mt, _ = mimetypes.guess_type(uri)
    return mt or "application/octet-stream"


def image_from_gcs(gcs_uri: str) -> types.Image:
    """Create an Image reference for a gs:// URI (SDK variants differ on field names)."""
    try:
        # Newer SDKs (and the ones that error on `uri=...`)
        return types.Image(gcs_uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))
    except Exception:
        # Some older SDKs used `uri=` for GCS.
        return types.Image(uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))  # type: ignore[arg-type]


def video_from_gcs(gcs_uri: str) -> types.Video:
    """Create a Video reference for a gs:// URI (SDK variants differ on field names)."""
    try:
        # Prefer gcs_uri= (matches the Image behavior and avoids pydantic extra-field errors)
        return types.Video(gcs_uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))  # type: ignore[arg-type]
    except Exception:
        # Some SDKs use `uri=` for GCS.
        return types.Video(uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))  # type: ignore[arg-type]


def sanitize_motion(motion: str) -> str:
    """Scrub style/"look" language from motion instructions; keep camera movement intent."""
    if not motion:
        return ""
    banned = {
        "premium", "cinematic", "ui", "interface", "dark", "gradient", "glow", "vignette", "bloom",
        "sleek", "futuristic", "beautiful", "stylish", "high-end", "aesthetic", "moody", "neon",
        "soft", "shimmer", "polished", "dramatic", "luxury", "depth", "hdr", "colorgraded",
    }
    # Keep punctuation but drop banned words case-insensitively.
    tokens = motion.replace("—", " ").replace("–", " ").split()
    kept: List[str] = []
    for t in tokens:
        # Strip common punctuation for matching, but preserve original token if kept.
        key = t.strip(".,;:!()[]{}\"'").lower()
        if key in banned:
            continue
        kept.append(t)
    return " ".join(kept).strip()


def build_prompt(scene: Dict[str, Any]) -> str:
    # Treat scene["prompt"] as CAMERA-MOTION ONLY
    motion = sanitize_motion((scene.get("prompt") or "").strip())
    vo = scene.get("vo")
    vo_text = "" if vo is None else str(vo).strip()
    # Required format:
    # Voiceover says: "..." (no subtitles)
    return (
        f"{STRICT_PREFIX}\n"
        "Static subject: zero subject animation.\n"
        f"Action: {motion}\n"
        f'Voiceover says: "{vo_text}" (no subtitles).'
    )


def operation_done(operation: Any) -> bool:
    done_attr = getattr(operation, "done", None)
    if callable(done_attr):
        try:
            return bool(done_attr())
        except Exception:
            return False
    return bool(done_attr)


def refresh_operation(client: genai.Client, operation: Any) -> Any:
    """
    Refresh operation using the most compatible `client.operations.get(...)` signature.
    Some SDK versions want an operation object; others accept name/id.
    """
    try:
        return client.operations.get(operation)
    except Exception:
        pass
    # Try by name
    name = getattr(operation, "name", None)
    if isinstance(name, str) and name:
        try:
            return client.operations.get(name)
        except Exception:
            pass
    # If it's already a string ID
    if isinstance(operation, str) and operation:
        return client.operations.get(operation)
    # Give up with a useful error
    raise RuntimeError(f"Unable to refresh operation; unsupported type: {type(operation)}")


def _as_dict(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj
    # pydantic models often have model_dump()
    md = getattr(obj, "model_dump", None)
    if callable(md):
        try:
            return md()
        except Exception:
            return obj
    return obj


def _extract_video_obj_and_uri(root: Any) -> Optional[Tuple[Any, str]]:
    """
    Look for generated_videos[0].video.(uri|gcs_uri) in either dicts or objects.
    Returns (video_obj, uri) or None.
    """
    if root is None:
        return None

    # dict path
    if isinstance(root, dict):
        gv = root.get("generated_videos")
        if isinstance(gv, list) and gv:
            first = gv[0]
            if isinstance(first, dict):
                video = first.get("video")
                if isinstance(video, dict):
                    uri = video.get("uri") or video.get("gcs_uri") or video.get("gcsUri")
                    if isinstance(uri, str) and uri:
                        return video, uri
                else:
                    # Sometimes video is a string URI
                    if isinstance(video, str) and video:
                        return video, video
            else:
                # first might be object-like
                video = getattr(first, "video", None)
                uri = getattr(video, "uri", None) or getattr(video, "gcs_uri", None)
                if isinstance(uri, str) and uri:
                    return video, uri
        return None

    # object path
    gv = getattr(root, "generated_videos", None)
    if isinstance(gv, list) and gv:
        first = gv[0]
        video = getattr(first, "video", None)
        if isinstance(video, str) and video:
            return video, video
        uri = getattr(video, "uri", None) or getattr(video, "gcs_uri", None)
        if isinstance(uri, str) and uri:
            return video, uri

    return None


def get_generated_video(operation: Any) -> Tuple[Any, str]:
    """
    Extract (video_obj, uri) from a completed operation.
    Also surfaces filtering/errors when present.
    """
    # Surface errors if present
    op_error = getattr(operation, "error", None)
    if op_error:
        raise RuntimeError(f"Operation error: {op_error}")

    # Try response then result, then operation itself
    for candidate in (getattr(operation, "response", None), getattr(operation, "result", None), operation):
        cand = _as_dict(candidate)
        found = _extract_video_obj_and_uri(cand)
        if found:
            video_obj, uri = found
            # Normalize video_obj to types.Video if it's a dict or string
            if isinstance(video_obj, types.Video):
                return video_obj, uri
            if isinstance(video_obj, str):
                return video_from_gcs(uri), uri
            if isinstance(video_obj, dict):
                # best-effort
                return video_from_gcs(uri), uri
            # object-like already
            return video_obj, uri

    # Check for safety filtering hints (best-effort)
    resp = getattr(operation, "response", None) or getattr(operation, "result", None)
    resp_d = _as_dict(resp)
    if isinstance(resp_d, dict):
        filtered = resp_d.get("rai_media_filtered_count")
        reasons = resp_d.get("rai_media_filtered_reasons")
        if filtered:
            raise RuntimeError(f"Output filtered by RAI: count={filtered}, reasons={reasons}")

    raise RuntimeError("Generated video URI missing on operation.response/result.")


def download_from_gcs(src: str, dst: str) -> str:
    gcloud = shutil.which("gcloud")
    gsutil = shutil.which("gsutil")
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    if gcloud:
        try:
            subprocess.run([gcloud, "storage", "cp", src, dst], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return dst
        except Exception:
            pass

    if gsutil:
        try:
            subprocess.run([gsutil, "-q", "cp", src, dst], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return dst
        except Exception:
            pass

    print(f"    WARNING: No downloader succeeded. File left in GCS: {src}")
    return src


def make_config(output_prefix: str) -> types.GenerateVideosConfig:
    """
    Build GenerateVideosConfig in a way that's compatible with Veo 3.x on Vertex.

    Important:
    - Veo 3 prompt enhancement cannot be disabled (API rejects enhance_prompt=False).
      So we DO NOT set enhance_prompt=False. By default we omit enhance_prompt entirely.
    - Audio continuity: generate_audio is requested on every call via this config.
    """
    kwargs: Dict[str, Any] = dict(
        aspect_ratio=ASPECT_RATIO,
        duration_seconds=DURATION_SECONDS,
        number_of_videos=1,
        output_gcs_uri=output_prefix,
        resolution=RESOLUTION,
        generate_audio=bool(GENERATE_AUDIO),
        negative_prompt=NEGATIVE_PROMPT,
    )

    # Some SDK versions might not support certain fields; drop unknown kwargs safely.
    try:
        return types.GenerateVideosConfig(**kwargs)
    except TypeError:
        for k in ["negative_prompt", "resolution", "generate_audio"]:
            try_kwargs = dict(kwargs)
            try_kwargs.pop(k, None)
            try:
                return types.GenerateVideosConfig(**try_kwargs)
            except TypeError:
                continue
        return types.GenerateVideosConfig(
            aspect_ratio=ASPECT_RATIO,
            duration_seconds=DURATION_SECONDS,
            number_of_videos=1,
            output_gcs_uri=output_prefix,
        )


def _call_generate_videos(
    client: genai.Client,
    prompt: str,
    output_prefix: str,
    image_obj: Optional[types.Image] = None,
    video_obj: Optional[types.Video] = None,
) -> Any:
    """
    Use the modern `source=GenerateVideosSource(...)` if available; fall back to prompt/image/video params.
    """
    # Veo rejects requests where both image and video are set.
    if image_obj is not None and video_obj is not None:
        raise ValueError("Image and video cannot both be set in a single generate_videos call")

    config = make_config(output_prefix)

    # Build source (preferred)
    try:
        # Only include the modality we intend to use.
        if video_obj is not None:
            source = types.GenerateVideosSource(prompt=prompt, video=video_obj)
        elif image_obj is not None:
            source = types.GenerateVideosSource(prompt=prompt, image=image_obj)
        else:
            source = types.GenerateVideosSource(prompt=prompt)
        return client.models.generate_videos(model=MODEL_ID, source=source, config=config)
    except TypeError:
        # Older SDK: prompt/image/video as top-level args
        kwargs: Dict[str, Any] = dict(model=MODEL_ID, prompt=prompt, config=config)
        if video_obj is not None:
            kwargs["video"] = video_obj
        elif image_obj is not None:
            kwargs["image"] = image_obj
        return client.models.generate_videos(**kwargs)


# ----------------------------
# GENERATION
# ----------------------------
def generate_video_chain(client: genai.Client, video_key: str, scenes: List[Dict[str, Any]]) -> List[str]:
    """
    Generate a sequence of clips. Scene 1 uses image->video.
    Scenes 2+ attempt to extend from the previous clip (video conditioning) to preserve continuity.
    If a previous clip URI is missing, we safely fall back to image->video (no invalid `video` inputs).
    """
    outputs: List[str] = []
    os.makedirs(os.path.join(OUTPUT_LOCAL_DIR, video_key), exist_ok=True)

    print(f"\nSTARTING: {video_key} ({len(scenes)} scenes)")
    prev_video_obj: Optional[types.Video] = None
    prev_uri: str = ""

    for i, scene in enumerate(scenes, start=1):
        img_uri = scene["img"]
        prompt = build_prompt(scene)
        image_obj = image_from_gcs(img_uri)

        out_prefix = OUTPUT_GCS_URI_BASE.rstrip("/") + f"/{video_key}/scene_{i:02d}/"

        # Decide chaining (OFF by default for UI fidelity).
        # NOTE: Veo rejects calls where both image and video are set.
        use_extension = bool(USE_VIDEO_EXTENSION) and bool(prev_uri) and prev_uri.startswith("gs://")
        video_obj: Optional[types.Video] = (
            prev_video_obj if (use_extension and isinstance(prev_video_obj, types.Video))
            else (video_from_gcs(prev_uri) if use_extension else None)
        )

        print(f"  Scene {i:02d}: {img_uri}")
        print(f"    Output: {out_prefix}")
        if use_extension:
            print(f"    Extending from: {prev_uri}")
        else:
            print("    Using image-only grounding (best fidelity)")

        try:
            operation = _call_generate_videos(
                client=client,
                prompt=prompt,
                output_prefix=out_prefix,
                # For fidelity: pass ONLY the reference image when not extending.
                # For chaining: pass ONLY the previous video when extending.
                image_obj=(image_obj if not use_extension else None),
                video_obj=(video_obj if use_extension else None),
            )
        except Exception as e:
            print(f"    ERROR: Failed to start generation for scene {i:02d}: {e}")
            outputs.append(f"ERROR: {e}")
            # Do not modify prev_* on failure
            continue

        # Poll operation (refresh until done, then refresh once more to ensure response is populated)
        while not operation_done(operation):
            time.sleep(POLL_SECONDS)
            operation = refresh_operation(client, operation)
        try:
            operation = refresh_operation(client, operation)
        except Exception:
            pass

        try:
            video_obj_out, uri = get_generated_video(operation)
            prev_uri = uri
            # Normalize video_obj_out to types.Video
            prev_video_obj = video_from_gcs(uri)
        except Exception as e:
            print(f"    ERROR: Could not extract video URI: {e}")
            outputs.append(f"ERROR: {e}")
            # Clear chaining so next scene starts fresh instead of passing invalid video
            prev_video_obj = None
            prev_uri = ""
            continue

        # Download
        scene_dir = os.path.join(OUTPUT_LOCAL_DIR, video_key, f"scene_{i:02d}")
        os.makedirs(scene_dir, exist_ok=True)
        local_path = os.path.join(scene_dir, "output.mp4")
        print(f"    Generated: {prev_uri}")
        print(f"    Download -> {local_path}")
        outputs.append(download_from_gcs(prev_uri, local_path))

    print(f"COMPLETE: {video_key}")
    return outputs


def concat_videos(video_key: str, scene_count: int) -> None:
    """
    Concatenate all scene videos for a given key into one file using ffmpeg.
    Safe: if ffmpeg is missing, skip without failing the run.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("[WARN] ffmpeg not found; skipping concat. Install ffmpeg to enable final assembly.")
        return

    concat_dir = os.path.join(OUTPUT_LOCAL_DIR, video_key)
    concat_file = os.path.join(concat_dir, f"{video_key}_full.mp4")

    reencoded_files: List[str] = []
    for i in range(1, scene_count + 1):
        scene_path = os.path.join(concat_dir, f"scene_{i:02d}", "output.mp4")
        if not os.path.exists(scene_path):
            continue

        reencoded_path = os.path.join(concat_dir, f"scene_{i:02d}", "output_reencoded.mp4")
        cmd = [
            ffmpeg, "-y", "-i", scene_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "faststart",
            reencoded_path
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            reencoded_files.append(reencoded_path)
        except Exception as e:
            print(f"[WARN] ffmpeg re-encode failed for {scene_path}: {e}")

    if not reencoded_files:
        print(f"[WARN] No reencoded scene files found for {video_key}; skipping concat.")
        return

    filelist_path = os.path.join(concat_dir, "filelist.txt")
    with open(filelist_path, "w", encoding="utf-8") as f:
        for p in reencoded_files:
            f.write(f"file '{p}'\n")

    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", filelist_path, "-c", "copy", concat_file]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[INFO] Concatenated video for {video_key}: {concat_file}")
    except Exception as e:
        print(f"[WARN] ffmpeg concat failed for {video_key}: {e}")


def diagnostics() -> None:
    import sys
    print("Diagnostics mode (DIAG=1):")
    print(f"  Python version: {sys.version.split()[0]}")
    genai_version = getattr(genai, "__version__", None)
    print(f"  google-genai version: {genai_version if genai_version else 'unknown'}")
    print(f"  Manifest path: {MANIFEST_PATH}")
    print(f"  PROJECT_ID set: {'yes' if bool(PROJECT_ID) else 'no'}")
    try:
        _, adc_project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        print(f"  ADC project detected: {'yes' if bool(adc_project) else 'no'}")
    except Exception:
        print("  ADC project detected: no")
    print(f"  ffmpeg present: {'yes' if bool(shutil.which('ffmpeg')) else 'no'}")
    print(f"  downloader gcloud: {'yes' if bool(shutil.which('gcloud')) else 'no'}")
    print(f"  downloader gsutil: {'yes' if bool(shutil.which('gsutil')) else 'no'}")
    print(f"  GENERATE_AUDIO: {GENERATE_AUDIO}")
    print(f"  USE_IMAGE_GROUNDING_IN_EXTENSION: {USE_IMAGE_GROUNDING_IN_EXTENSION}")
    print(f"  DURATION_SECONDS: {DURATION_SECONDS}")
    print(f"  ASPECT_RATIO: {ASPECT_RATIO}")
    print(f"  RESOLUTION: {RESOLUTION}")


# ----------------------------
# ENTRYPOINT
# ----------------------------
if __name__ == "__main__":
    require_env()
    ensure_adc_or_die()
    manifest = load_manifest(MANIFEST_PATH)

    if DIAG:
        diagnostics()

    client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

    keys_env = (os.environ.get("VIDEO_KEYS") or "").strip()
    if keys_env:
        keys = [k.strip() for k in keys_env.split(",") if k.strip()]
    else:
        keys = list(manifest["videos"].keys())

    only_concat = os.environ.get("ONLY_CONCAT", "0") == "1"

    for key in keys:
        scenes_all = manifest["videos"][key]["scenes"]
        scenes = scenes_all[:MAX_SCENES] if (MAX_SCENES and MAX_SCENES > 0) else scenes_all

        if only_concat:
            concat_videos(key, len(scenes))
            continue

        outputs = generate_video_chain(client, key, scenes)
        # concat uses scene count rather than outputs to avoid treating "ERROR:" strings as files
        concat_videos(key, len(scenes))
