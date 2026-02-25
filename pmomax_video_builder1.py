# -*- coding: utf-8 -*-
import os
import time
import json
import mimetypes
import shutil
import subprocess
from typing import Dict, List, Any

# Load .env if present (optional)
try:
    from dotenv import load_dotenv  # type: ignore
    dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
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

GENERATE_AUDIO = os.environ.get("GENERATE_AUDIO", "0") == "1"
RESOLUTION = (os.environ.get("RESOLUTION") or "1080p").strip()

MANIFEST_PATH = (
    os.environ.get("MANIFEST_PATH")
    or os.path.join(os.path.dirname(__file__), "clip_manifest1.json")
).strip()

try:
    DURATION_SECONDS = int(os.environ.get("DURATION_SECONDS", "8"))
except Exception:
    DURATION_SECONDS = -1


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
def mime_for_uri(gcs_uri: str) -> str:
    mt, _ = mimetypes.guess_type(gcs_uri)
    return mt or "image/png"


def image_from_gcs(gcs_uri: str) -> types.Image:
    return types.Image(gcs_uri=gcs_uri, mime_type=mime_for_uri(gcs_uri))


def build_prompt(scene: Dict[str, Any]) -> str:
    base = (scene.get("prompt") or "").strip()
    vo = (scene.get("vo") or "").strip()
    if vo:
        return f"{base}\nVoiceover: {vo}\nNo subtitles."
    return base


def operation_done(operation) -> bool:
    done_attr = getattr(operation, "done", None)
    if callable(done_attr):
        try:
            return bool(done_attr())
        except Exception:
            return False
    return bool(done_attr)


def get_generated_video_uri(operation) -> str:
    # Prefer operation.response, fall back to operation.result depending on SDK version
    resp = getattr(operation, "response", None)
    if resp and getattr(resp, "generated_videos", None):
        video_obj = resp.generated_videos[0].video
        uri = getattr(video_obj, "uri", None)
        if uri:
            return uri

    result = getattr(operation, "result", None)
    if result and getattr(result, "generated_videos", None):
        video_obj = result.generated_videos[0].video
        uri = getattr(video_obj, "uri", None)
        if uri:
            return uri

    raise RuntimeError("Generated video URI missing on operation.response/result.")


def download_from_gcs(src: str, dst: str) -> str:
    gcloud = shutil.which("gcloud")
    gsutil = shutil.which("gsutil")

    os.makedirs(os.path.dirname(dst), exist_ok=True)

    if gcloud:
        try:
            subprocess.run([gcloud, "storage", "cp", src, dst], check=True)
            return dst
        except Exception:
            pass

    if gsutil:
        try:
            subprocess.run([gsutil, "cp", src, dst], check=True)
            return dst
        except Exception:
            pass

    print(f"    WARNING: No downloader succeeded. File left in GCS: {src}")
    return src


# ----------------------------
# GENERATION
# ----------------------------
def generate_video_set(client, video_key: str, scenes: List[Dict[str, Any]]) -> List[str]:
    """
    Generate each scene clip for a given video key, poll for completion, download results,
    and return local output paths (or GCS URIs if download fails).
    """
    outputs: List[str] = []
    print(f"\nSTARTING: {video_key} ({len(scenes)} clips)")

    for i, scene in enumerate(scenes, start=1):
        img_uri = scene["img"]
        prompt = build_prompt(scene)
        image_obj = image_from_gcs(img_uri)

        out_prefix = OUTPUT_GCS_URI_BASE.rstrip("/") + f"/{video_key}/scene_{i:02d}/"
        config = types.GenerateVideosConfig(
            aspect_ratio=ASPECT_RATIO,
            duration_seconds=DURATION_SECONDS,
            number_of_videos=1,
            output_gcs_uri=out_prefix,
            resolution=RESOLUTION,
            generate_audio=GENERATE_AUDIO,
        )

        print(f"  Scene {i:02d}: {img_uri}")
        print(f"    Output: {out_prefix}")

        try:
            operation = client.models.generate_videos(
                model=MODEL_ID,
                prompt=prompt,
                image=image_obj,
                config=config,
            )
        except Exception as e:
            print(f"    ERROR: Failed to start generation for scene {i:02d}: {e}")
            outputs.append(f"ERROR: {e}")
            continue

        # Poll operation (IMPORTANT: pass OPERATION OBJECT, not a string)
        while not operation_done(operation):
            time.sleep(POLL_SECONDS)
            operation = client.operations.get(operation)

        try:
            gcs_video_uri = get_generated_video_uri(operation)
        except Exception as e:
            print(f"    ERROR: Could not extract video URI: {e}")
            outputs.append(f"ERROR: {e}")
            continue

        scene_dir = os.path.join(OUTPUT_LOCAL_DIR, video_key, f"scene_{i:02d}")
        os.makedirs(scene_dir, exist_ok=True)
        local_path = os.path.join(scene_dir, "output.mp4")

        print(f"    Generated: {gcs_video_uri}")
        print(f"    Download -> {local_path}")

        result_path = download_from_gcs(gcs_video_uri, local_path)
        outputs.append(result_path)

    print(f"COMPLETE: {video_key}")
    return outputs


def concat_videos(video_key: str, outputs: List[str]) -> None:
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
    for i in range(1, len(outputs) + 1):
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
        for scene in reencoded_files:
            f.write(f"file '{scene}'\n")

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

    for key in keys:
        scenes = manifest["videos"][key]["scenes"]
        outputs = generate_video_set(client, key, scenes)
        concat_videos(key, outputs)