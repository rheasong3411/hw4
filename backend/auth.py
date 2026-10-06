"""Accounts: password hashing, sign-up, log-in and session cookies.

Passwords are never stored. Each user row keeps a salted PBKDF2-SHA256 hash:

* Seed accounts use  ``pbkdf2_sha256$<salt>$<hex digest>`` at 120,000 iterations
  (the format already in campus_customs.db).
* New accounts use   ``pbkdf2_sha256$<iterations>$<salt>$<hex digest>`` at
  600,000 iterations with a 16-byte random salt, so the work factor is
  recorded and can be raised later without breaking old hashes.

After sign-up or log-in the browser gets an HttpOnly cookie holding the user id
and an expiry, signed with HMAC so it cannot be forged or read by page scripts.
"""

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from collections.abc import Iterator
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, field_validator

from db import connect

ALGORITHM = "pbkdf2_sha256"
LEGACY_ITERATIONS = 120_000
ITERATIONS = 600_000  # OWASP's recommendation for PBKDF2-SHA256
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

SESSION_COOKIE = "cc_session"
SESSION_SECONDS = 7 * 24 * 60 * 60
load_dotenv(Path(__file__).resolve().parent.parent / ".env")  # hw4/.env
# Set SESSION_SECRET in .env to keep shoppers signed in across restarts;
# otherwise a random secret is made at startup and old sessions simply expire.
SESSION_SECRET = os.environ.get("SESSION_SECRET") or secrets.token_hex(32)

# Simple brute-force guard: lock an email out after repeated wrong passwords.
MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60
failed_logins: dict[str, list[float]] = {}

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------- Password hashing ----------


def pbkdf2(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    ).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = pbkdf2(password, salt, ITERATIONS)
    return f"{ALGORITHM}${ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split("$")
    if parts[0] != ALGORITHM:
        return False
    if len(parts) == 3:  # seed format, no iteration count
        _, salt, digest = parts
        iterations = LEGACY_ITERATIONS
    elif len(parts) == 4:
        _, iterations_text, salt, digest = parts
        iterations = int(iterations_text)
    else:
        return False
    # compare_digest takes the same time however many characters match.
    return hmac.compare_digest(pbkdf2(password, salt, iterations), digest)


# Checked against when an email is unknown, so a miss costs as much time as a
# wrong password and response timing does not reveal which emails exist.
DUMMY_HASH = hash_password(secrets.token_hex(16))


# ---------- Sessions ----------


def sign(value: str) -> str:
    return hmac.new(SESSION_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def make_session_token(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + SESSION_SECONDS}"
    return f"{payload}.{sign(payload)}"


def read_session_token(token: str) -> int | None:
    try:
        user_id, expires, signature = token.split(".")
    except ValueError:
        return None
    if not hmac.compare_digest(sign(f"{user_id}.{expires}"), signature):
        return None
    if int(expires) < time.time():
        return None
    return int(user_id)


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        make_session_token(user_id),
        max_age=SESSION_SECONDS,
        httponly=True,  # page JavaScript cannot read it
        samesite="lax",  # not sent on cross-site form posts
        secure=False,  # local http; set True when served over https
    )


# ---------- Request and response shapes ----------


def normalize_email(email: str) -> str:
    return email.strip().lower()


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

    @field_validator("first_name", "last_name")
    @classmethod
    def name_present(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("is required")
        if len(value) > 60:
            raise ValueError("must be 60 characters or fewer")
        return value

    @field_validator("email")
    @classmethod
    def email_valid(cls, value: str) -> str:
        value = normalize_email(value)
        if not EMAIL_PATTERN.match(value) or len(value) > 254:
            raise ValueError("must be a valid email address")
        return value

    @field_validator("password")
    @classmethod
    def password_strong_enough(cls, value: str) -> str:
        if len(value) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"must be at least {MIN_PASSWORD_LENGTH} characters")
        if len(value) > MAX_PASSWORD_LENGTH:
            raise ValueError(f"must be {MAX_PASSWORD_LENGTH} characters or fewer")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    first_name: str
    last_name: str
    email: str
    created_at: str


def user_out(row: sqlite3.Row) -> UserOut:
    # Seed rows may lack first/last name, so fall back to splitting `name`.
    first, _, last = row["name"].partition(" ")
    return UserOut(
        id=row["id"],
        name=row["name"],
        first_name=row["first_name"] or first,
        last_name=row["last_name"] or last,
        email=row["email"],
        created_at=row["created_at"],
    )


def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def current_user(request: Request, conn: sqlite3.Connection = Depends(get_db)) -> UserOut:
    """Dependency for routes that need a signed-in shopper."""
    token = request.cookies.get(SESSION_COOKIE)
    user_id = read_session_token(token) if token else None
    row = None
    if user_id is not None:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user_out(row)


def optional_user(
    request: Request, conn: sqlite3.Connection = Depends(get_db)
) -> UserOut | None:
    """Dependency for routes that work for guests too, like chat."""
    try:
        return current_user(request, conn)
    except HTTPException:
        return None


def check_not_locked(email: str) -> None:
    now = time.time()
    recent = [t for t in failed_logins.get(email, []) if now - t < LOCKOUT_SECONDS]
    failed_logins[email] = recent
    if len(recent) >= MAX_FAILED_LOGINS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many failed attempts. Please wait 15 minutes and try again.",
        )


# ---------- Routes ----------


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(
    body: SignupRequest, response: Response, conn: sqlite3.Connection = Depends(get_db)
) -> UserOut:
    try:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                f"{body.first_name} {body.last_name}",
                body.email,
                hash_password(body.password),
                body.first_name,
                body.last_name,
            ),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists."
        )
    row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    set_session_cookie(response, row["id"])
    return user_out(row)


@router.post("/login")
def login(
    body: LoginRequest, response: Response, conn: sqlite3.Connection = Depends(get_db)
) -> UserOut:
    email = normalize_email(body.email)
    check_not_locked(email)
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    password_ok = verify_password(body.password, row["password_hash"] if row else DUMMY_HASH)
    if row is None or not password_ok:
        failed_logins.setdefault(email, []).append(time.time())
        # Same message either way, so the form does not reveal which emails exist.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    failed_logins.pop(email, None)
    set_session_cookie(response, row["id"])
    return user_out(row)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE)


@router.get("/me")
def me(user: UserOut | None = Depends(optional_user)) -> UserOut | None:
    """The signed-in user, or null for guests (200 either way, so a guest's
    page load does not log an error)."""
    return user
