PMOMax Deterministic Fancy Builder

Files
- pmomax_deterministic_fancy_builder.py  (main)
- clip_manifest.json  (generated from your tables; this drives chronology)

Quick start (deterministic + existing per-scene audio in manifest)
1) export OUTPUT_LOCAL_DIR=/tmp/pmomax_vid_out
2) python pmomax_deterministic_fancy_builder.py

If your manifest doesn't include "audio" per scene, you have two options:

Option A: Use Veo to generate *audio only* (cached), then mux into deterministic video
- Requires google-genai + Vertex permissions and a GCS output prefix
- Exports:
  export AUDIO_MODE=auto
  export ENABLE_VEO_AUDIO=1
  export PROJECT_ID=YOUR_GCP_PROJECT
  export LOCATION=us-central1
  export MODEL_ID=veo-3.1-generate-001
  export OUTPUT_GCS_URI_BASE=gs://YOUR_BUCKET/path/generated
  # optional:
  export AUDIO_GCS_URI_BASE=gs://YOUR_BUCKET/path/generated_audio
Run:
  python pmomax_deterministic_fancy_builder.py

Option B: Use Cloud Text-to-Speech (fallback) for VO (cached)
- pip install google-cloud-texttospeech
- export AUDIO_MODE=tts
- export ENABLE_TTS=1
- export PROJECT_ID=YOUR_GCP_PROJECT (ADC must be set)
Run:
  python pmomax_deterministic_fancy_builder.py

Notes
- The output MP4 ALWAYS contains an audio track (real audio if available, otherwise silence).
- Chronology is strictly the scene order in clip_manifest.json.
- No UI hallucinations: every pixel comes from your screenshots (scale/crop/overlay only).

