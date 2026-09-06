"""
Verifies the Supabase-issued JWT sent by the frontend on every request
(`Authorization: Bearer <access_token>`), and resolves it to the caller's
profile row (id, role, department, linked faculty/student group).

FastAPI route handlers depend on `get_current_user` (any authenticated user)
or `require_role("ADMIN")` (role-gated endpoints) instead of trusting
whatever the frontend claims about itself.
"""
from fastapi import Depends, HTTPException, Header
from typing import Optional
from app.supabase_client import get_supabase


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1]
    supabase = get_supabase()

    try:
        user_resp = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    user = getattr(user_resp, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="No profile found for this account")

    return profile.data


def require_role(*allowed_roles: str):
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(allowed_roles)}")
        return current_user
    return _check
