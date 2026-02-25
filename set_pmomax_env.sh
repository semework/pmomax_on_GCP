#!/bin/bash
# Set environment variables for PMOMax video builder

export PROJECT_ID="pmomax-video-project"
export OUTPUT_LOCAL_DIR="/Users/mulugetasemework/Library/Mobile Documents/com~apple~CloudDocs/projects/PMO/pmo26/generated_videos"
export OUTPUT_GCS_URI_BASE="gs://pmomax-video-assets-bucket/pmomax-video-assets/generated"
export MANIFEST_PATH="/Users/mulugetasemework/Library/Mobile Documents/com~apple~CloudDocs/projects/PMO/pmo26/clip_manifest.json"

# Optional overrides
export LOCATION="us-central1"
export MODEL_ID="veo-3.1-generate-001"
export DURATION_SECONDS=8
export SCENE_DURATION_SECONDS=8
export WIDTH=1920
export HEIGHT=1080
export FPS=30

echo "PMOMax environment variables set."
