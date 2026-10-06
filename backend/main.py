"""Campus Customs API: the app uvicorn runs.

Serves the product catalogue, stock by size and product images from
data/campus_customs.db, shopper accounts (auth.py) and the shopping chat agent
(agent.py).

Run from the backend folder:

    uvicorn main:app --reload --port 8000
"""

import logging
import sqlite3
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import tools
from images import ensure_clean_images
from agent import GUARD_STATS, MAX_HISTORY_TURNS, MODEL_NAME, run_chat
from auth import UserOut, current_user, get_db, optional_user
from auth import router as auth_router
from db import DATA_DIR
from models import ChatMessageOut, ChatRequest, ChatResponse, Product

logger = logging.getLogger("campus_customs")

# How many saved messages to send back when a signed-in shopper reopens chat.
HISTORY_LIMIT = 50

# Chat rate limit per shopper (signed-in user, or IP address for guests):
# protects the model budget from abuse or a runaway script.
CHAT_RATE_LIMIT = 20
CHAT_RATE_WINDOW_SECONDS = 5 * 60
_chat_times: dict[str, deque] = defaultdict(deque)


def check_chat_rate(key: str) -> None:
    now = time.monotonic()
    times = _chat_times[key]
    while times and now - times[0] > CHAT_RATE_WINDOW_SECONDS:
        times.popleft()
    if len(times) >= CHAT_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="You're sending messages quickly. Please wait a few minutes and try again.",
        )
    times.append(now)

# Make black photo backgrounds transparent so every product photo sits on the
# same background (see images.py). Only missing or outdated copies are built,
# so after the first run this takes a moment.
cleaned = ensure_clean_images()
if cleaned:
    logging.getLogger("campus_customs").info("Cleaned %d product photos", cleaned)

app = FastAPI(title="Campus Customs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# Product photos live at data/products/*.jpg and the catalogue stores paths
# like "products/x.jpg", so mounting data/ at /media gives /media/products/x.jpg.
app.mount("/media", StaticFiles(directory=DATA_DIR), name="media")


@app.get("/api/health")
def health() -> dict:
    # honesty_guard: replies checked, corrections the guard asked for, and
    # replies replaced by the safe fallback, since the server started.
    return {"status": "ok", "model": MODEL_NAME, "honesty_guard": GUARD_STATS}


# ---------- Products ----------


@app.get("/api/products")
def list_products() -> list[Product]:
    return tools.load_products()


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> Product:
    product = tools.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/api/products/{product_id}/alternatives")
def product_alternatives(product_id: str, size: str | None = None) -> list[Product]:
    """Similar in-stock products (in `size`, if given), the same ranking the
    agent's find_alternatives tool uses. Feeds "Similar styles in stock"."""
    alternatives = tools.find_alternatives(product_id, size)
    if not isinstance(alternatives, list):
        raise HTTPException(status_code=404, detail="Product not found")
    return [p for p in (tools.get_product(a.product_id) for a in alternatives) if p is not None]


# ---------- Chat ----------


@app.post("/api/chat")
async def chat(
    body: ChatRequest,
    request: Request,
    user: UserOut | None = Depends(optional_user),
    conn: sqlite3.Connection = Depends(get_db),
) -> ChatResponse:
    check_chat_rate(f"user:{user.id}" if user else f"ip:{request.client.host if request.client else 'unknown'}")
    # Signed-in shoppers: who they are and what they said before both come
    # from the database, not from the browser. Guests: the browser's turns.
    customer = tools.customer_profile(user.id) if user else None
    history = (
        tools.recent_chat_turns(user.id, MAX_HISTORY_TURNS) if user else body.history
    )
    try:
        response = await run_chat(body.message, history, customer=customer, page=body.page)
    except Exception:
        logger.exception("Chat agent failed")
        raise HTTPException(
            status_code=502,
            detail="Our assistant is having trouble right now. Please try again in a moment.",
        )

    # Only signed-in shoppers' chats are saved.
    if user:
        tools.save_chat_message(conn, user.id, "user", body.message, [])
        tools.save_chat_message(conn, user.id, "assistant", response.reply, response.products)
        conn.commit()
    return response


@app.get("/api/chat/history")
def chat_history(user: UserOut = Depends(current_user)) -> list[ChatMessageOut]:
    return tools.saved_chat_history(user.id, HISTORY_LIMIT)
