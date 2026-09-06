"""
Supabase connection for the backend.

The backend uses the SERVICE ROLE key (never exposed to the frontend) so it
can read/write across all tables regardless of RLS policy, while the API
layer itself enforces who is allowed to do what (see auth.py). This mirrors
how most FastAPI + Supabase setups work: RLS protects direct client access
(e.g. if someone calls the Supabase REST/JS API directly with their own
session), and the trusted backend does its own authorization checks using
the caller's verified role.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


@lru_cache
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.startswith("REPLACE_ME"):
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured. "
            "Set them in backend/.env (see backend/.env.example)."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


db = None  # populated lazily by main.py on first request to give a clean startup error
