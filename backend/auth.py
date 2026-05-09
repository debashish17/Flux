"""
Supabase Auth integration.

Verifies Supabase-issued JWTs (asymmetric, RS256/ES256) using the project's
JWKS endpoint, and lazily mirrors the user into our `public.users` table on
first request.

For projects still on the legacy HS256 shared secret, set
SUPABASE_JWT_SECRET in .env — that path is used as a fallback.
"""
import os
import time
import logging
from typing import Optional

import httpx
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import database

logger = logging.getLogger("uvicorn.error")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # legacy HS256 fallback
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

JWKS_TTL_SECONDS = 3600  # refresh public keys hourly
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)


async def _get_jwks() -> list[dict]:
    """Fetch & cache the project's JWKS document."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not configured")

    url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    _jwks_cache["keys"] = data.get("keys", [])
    _jwks_cache["fetched_at"] = now
    logger.info(f"Refreshed JWKS from {url} ({len(_jwks_cache['keys'])} keys)")
    return _jwks_cache["keys"]


def _find_key(jwks: list[dict], kid: Optional[str]) -> Optional[dict]:
    if not kid:
        # Some tokens lack kid; fall back to the first key.
        return jwks[0] if jwks else None
    for key in jwks:
        if key.get("kid") == kid:
            return key
    return None


async def _verify_with_jwks(token: str) -> dict:
    """Verify token signature using the JWKS endpoint."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg", "RS256")

    jwks = await _get_jwks()
    key = _find_key(jwks, kid)
    if key is None:
        # Maybe the key just rotated — bust the cache and retry once.
        _jwks_cache["fetched_at"] = 0.0
        jwks = await _get_jwks()
        key = _find_key(jwks, kid)

    if key is None:
        raise JWTError(f"No matching JWKS key for kid={kid}")

    return jwt.decode(
        token,
        key,
        algorithms=[alg],
        audience=SUPABASE_JWT_AUDIENCE,
    )


def _verify_with_secret(token: str) -> dict:
    """Legacy HS256 verification (kept for backwards compatibility)."""
    return jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience=SUPABASE_JWT_AUDIENCE,
    )


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(database.get_db)):
    """
    Validate a Supabase JWT and return the matching row from `public.users`.
    Creates the row on first sight (lazy mirror of `auth.users`).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Inspect the token header to decide which verification path to use.
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "")

        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise JWTError("HS256 token received but SUPABASE_JWT_SECRET not set")
            payload = _verify_with_secret(token)
        else:
            if not SUPABASE_URL:
                raise JWTError("Asymmetric token received but SUPABASE_URL not set")
            payload = await _verify_with_jwks(token)

    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise credentials_exception
    except httpx.HTTPError as e:
        logger.error(f"JWKS fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth provider unreachable",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise credentials_exception

    user = await db.user.find_unique(where={"id": user_id})

    if user is None:
        # First time we see this Supabase user — mirror them into public.users.
        if not email:
            raise credentials_exception
        try:
            user = await db.user.create(
                data={"id": user_id, "email": email}
            )
            logger.info(f"Mirrored new Supabase user {user_id} ({email}) into public.users")
        except Exception as e:
            # Race: another request created the row between find and create.
            logger.warning(f"User create raced or failed, refetching: {e}")
            user = await db.user.find_unique(where={"id": user_id})
            if user is None:
                raise credentials_exception

    return user
