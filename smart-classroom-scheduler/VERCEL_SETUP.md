# Vercel Deployment Setup

## Fixed: backend entrypoint (2026-09)
Vercel's Python runtime requires the file at `api/index.py` to export a
top-level variable literally named `app` (a plain ASGI app). The previous
version wrapped FastAPI in `Mangum` and exported it as `handler`, which is
the AWS-Lambda pattern, not Vercel's. That mismatch made **every** `/api/*`
route fail silently on Vercel — which is why the chatbot and every action
button looked broken while the static frontend loaded fine. `api/index.py`
now just does `from app.main import app`, nothing else needed.

If you ever redeploy and things break again, first check: does `api/index.py`
export `app` (not `handler`)? Is Root Directory left blank at repo root
(not set to `frontend`)? Those two are the most common causes of a
fully-broken backend on Vercel.


## Root Directory
Set **Root Directory** to: (leave blank / use repo root)

## Build & Output Settings
These are auto-handled by vercel.json:
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/dist`
- Install Command: (leave blank)

## Environment Variables (Vercel → Project Settings → Environment Variables)

### Frontend (required for Supabase auth — app works without these via demo login)
| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xmvjuqopiufniqwzdbsp.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable__d64LZtV_GG4sXWHSkei4g_Hc0H5wTz` |

### Backend (optional — only needed for Gemini vision & Supabase DB features)
| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `SUPABASE_URL` | `https://xmvjuqopiufniqwzdbsp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

## Demo Accounts (always work without any env vars)
- Admin: `admin@vit.ac.in` / any password
- Faculty: `dr.sharma@vit.ac.in` / any password  
- Student: `student.aaryan@vit.ac.in` / any password
