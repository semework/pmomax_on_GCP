#!/usr/bin/env python3
"""Heartbeat check for Sematech Gemini API-key authentication."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / ".env"
PLACEHOLDER = "PLACEHOLDER_REPLACE_ME"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> int:
    env = load_env(ENV_PATH)
    api_key = env.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    project_id = env.get("PROJECT_ID") or os.getenv("PROJECT_ID", "sematech")
    model_name = env.get("MODEL_NAME") or os.getenv("MODEL_NAME", "gemini-1.5-flash")

    print(f"Project: {project_id}")
    print(f"Model: {model_name}")
    print(f"Env file: {ENV_PATH}")

    if not api_key or api_key == PLACEHOLDER:
        print("GEMINI_API_KEY is still PLACEHOLDER_REPLACE_ME.")
        print("Open .env, add your API key, then rerun: python3 verify_sematech.py")
        return 2

    try:
        import google.generativeai as genai
    except ImportError:
        print("Missing dependency: google-generativeai")
        print("Install it in this environment, then rerun: pip install google-generativeai")
        return 1

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            'Translate this sentence into Amharic and return only the translation: '
            '"The translation engine is live"'
        )
        translated = (getattr(response, "text", "") or "").strip()
    except Exception as exc:
        print(f"Gemini heartbeat failed: {exc}")
        return 1

    if not translated:
        print("Gemini heartbeat failed: empty response")
        return 1

    print("Gemini heartbeat succeeded.")
    print(f"Translation: {translated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
