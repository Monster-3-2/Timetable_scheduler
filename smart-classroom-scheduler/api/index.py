"""
Vercel Python entrypoint.

IMPORTANT: Vercel's Python runtime requires this file to export a top-level
variable literally named `app` (a plain ASGI application). It does NOT use
Mangum / AWS-Lambda-style adapters. Exporting a Mangum-wrapped object as
`handler` here is the old/incorrect pattern -- it silently breaks EVERY
/api/* route on Vercel, which produces exactly the "chatbot doesn't work,
every button doesn't work" symptom (the frontend loads fine because it's
static, but every fetch('/api/...') call fails).

Vercel routes all /api/* requests here via the rewrite rule in vercel.json.
"""
import sys
import os

# Make `from app.xxx import ...` resolve against the backend/ package.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app  # noqa: E402  (Vercel looks for this exact name: `app`)
