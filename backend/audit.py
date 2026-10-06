"""Append-only audit trail of agent-loop activity: output/audit_trail.json.

One entry per chat turn: when it ran, who asked (user id or guest, never an
email), every tool call with short args and result, honesty-guard retries,
token usage, and why the loop stopped. Entries are only ever added: the file is
read, the new entry appended, and the whole list written to a temporary file
that atomically replaces the old one, so a crash mid-write cannot truncate it.
A file that is not valid JSON is moved aside (never deleted) and a new one
started.
"""

import json
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic_ai.messages import (
    ModelMessage,
    ModelResponse,
    RetryPromptPart,
    ToolCallPart,
    ToolReturnPart,
)

AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"

# How much of each argument, result or message to keep.
MAX_TEXT = 300

_lock = threading.Lock()

# Sensitive values are masked before anything is written, because the trail is
# kept long-term (and committed with the project).
STORE_EMAIL = "orderdept@campuscustoms.com"
STORE_PHONE = "(475) 301-4205"
CARD_PATTERN = re.compile(r"\b(?:\d[ -]?){13,19}\b")
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_PATTERN = re.compile(r"(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b")


def redact(text: str) -> str:
    """Mask card-like numbers, emails and phone numbers (except the store's own)."""
    text = CARD_PATTERN.sub("[card number removed]", text)
    text = EMAIL_PATTERN.sub(lambda m: m[0] if m[0].lower() == STORE_EMAIL else "[email removed]", text)
    return PHONE_PATTERN.sub(lambda m: m[0] if m[0] == STORE_PHONE else "[phone removed]", text)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def short(value: Any, limit: int = MAX_TEXT) -> str:
    """A compact one-line string for an argument or result."""
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    if isinstance(value, list) and value and hasattr(value[0], "model_dump"):
        value = [v.model_dump() for v in value]
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    text = redact(" ".join(text.split()))
    return text if len(text) <= limit else text[: limit - 1] + "…"


def summarize_result(content: Any) -> str:
    """Tool results can be long lists; record the count plus the start."""
    if isinstance(content, list):
        return f"{len(content)} results: " + short(content, MAX_TEXT - 20)
    return short(content)


def loop_steps(messages: list[ModelMessage]) -> tuple[list[dict], list[str], str | None]:
    """Tool calls (with results), guard retry messages, and the last model
    finish_reason, from the messages a run produced."""
    calls: dict[str, dict] = {}
    steps: list[dict] = []
    retries: list[str] = []
    finish_reason = None
    for message in messages:
        if isinstance(message, ModelResponse):
            finish_reason = message.finish_reason or finish_reason
        for part in message.parts:
            if isinstance(part, ToolCallPart) and part.tool_name != "final_result":
                step = {
                    "time": message.timestamp.isoformat(timespec="milliseconds")
                    if getattr(message, "timestamp", None)
                    else None,
                    "tool": part.tool_name,
                    "args": short(part.args_as_dict() if hasattr(part, "args_as_dict") else part.args),
                    "result": None,
                }
                calls[part.tool_call_id] = step
                steps.append(step)
            elif isinstance(part, ToolReturnPart) and part.tool_call_id in calls:
                calls[part.tool_call_id]["result"] = summarize_result(part.content)
            elif isinstance(part, RetryPromptPart):
                text = part.content if isinstance(part.content, str) else short(part.content)
                retries.append(short(text, 240))
    return steps, retries, finish_reason


def append_entry(entry: dict) -> None:
    """Add one entry to the trail without ever removing earlier ones."""
    with _lock:
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        entries: list = []
        if AUDIT_PATH.exists():
            try:
                entries = json.loads(AUDIT_PATH.read_text(encoding="utf-8") or "[]")
                if not isinstance(entries, list):
                    raise ValueError("audit trail is not a list")
            except ValueError:
                # Keep the unreadable file for inspection instead of wiping it.
                stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
                AUDIT_PATH.rename(AUDIT_PATH.with_suffix(f".corrupt-{stamp}.json"))
                entries = []
        entries.append(entry)
        tmp = AUDIT_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, AUDIT_PATH)
