"""Shared SQLite connection for the Campus Customs backend."""

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "campus_customs.db"


def connect() -> sqlite3.Connection:
    # FastAPI may open a connection in one worker thread and use it in another
    # within the same request, so allow cross-thread use.
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
