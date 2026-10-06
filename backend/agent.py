"""Campus Customs shopping agent: model, prompt and tool wiring.

main.py calls ``run_chat`` for each message from the website's chat widget.
The agent reads prompts/prompt.md as its instructions, answers through the
tools in tools.py, and returns a ShopReply (models.py). Product ids in the
reply are checked against the database before they reach the shopper.

Per-message context travels in ChatDeps: who is chatting (CustomerProfile,
signed-in shoppers only) and which page they are on (PageContext, with the
product resolved from the database when they are on a product page).

The honesty guard (an output validator) checks each reply's prices, stock
counts and product ids against what the tools actually returned this turn, and
sends the agent back to fix any mismatch before the shopper sees it.
"""

import logging
import os
import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from pydantic_ai import Agent, ModelRetry, RunContext, capture_run_messages
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart, UserPromptPart
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

import audit
import tools
from models import (
    MAX_RESULTS,
    Alternative,
    Category,
    ChatResponse,
    ChatTurn,
    CustomerProfile,
    PageContext,
    PastChatMessage,
    PriceInfo,
    ProductDescription,
    ProductNotFound,
    ProductSummary,
    ShopReply,
    StockReport,
)

logger = logging.getLogger("campus_customs.agent")

HERE = Path(__file__).resolve().parent
PROMPT_PATH = HERE / "prompts" / "prompt.md"

# hw4/.env first (PORTKEY_API_KEY, SESSION_SECRET, optional MODEL), then any
# .env in a folder above it (e.g. a shared course workspace). Earlier files win;
# none of them is committed.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")
for folder in HERE.parents:
    load_dotenv(folder / ".env")

MODEL_NAME = os.getenv("MODEL", "gpt-5.6-luna")
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"
_api_key = os.getenv("PORTKEY_API_KEY")
if not _api_key:
    raise RuntimeError(
        "PORTKEY_API_KEY is missing. Copy .env.example to .env and set it."
    )

model = OpenAIChatModel(
    MODEL_NAME,
    provider=OpenAIProvider(base_url=PORTKEY_BASE_URL, api_key=_api_key),
)

# A turn is usually a search plus a few price or stock lookups (one per item
# discussed); anything far beyond that is a loop, and these caps stop it
# before it costs much.
CHAT_LIMITS = UsageLimits(request_limit=8, tool_calls_limit=14)

# Sent when the model provider's content filter blocks a message, which
# happens for jailbreak attempts like "ignore all previous instructions".
FILTERED_REPLY = (
    "Sorry, I can't help with that. I'm here for Campus Customs shopping: products, "
    "sizes, prices, stock and store info. What can I help you find?"
)

# Sent when the honesty guard still finds a wrong figure after the retries.
UNVERIFIED_REPLY = (
    "Sorry, I couldn't confirm exact prices and stock for that just now. The product pages "
    "always show the current price and stock by size, or you can ask me again."
)

# Sent, without calling the model, when a message signals a personal crisis.
# The provider's content filter can block such messages before the agent sees
# them, so this is decided in code rather than left to the prompt.
CRISIS_REPLY = (
    "I'm really sorry you're feeling this way, and I'm glad you said something. You don't "
    "have to go through it alone: please reach out to someone you trust. In the US you can "
    "call or text 988 (Suicide & Crisis Lifeline) any time, or call 911 if you're in "
    "immediate danger. I'm here whenever you want to chat about the shop, too."
)
CRISIS_PATTERN = re.compile(
    r"\b(suicid\w*|kill(ing)? myself|end(ing)? (it all|my life)|want(ed)? to die|"
    r"self[- ]?harm\w*|hurt(ing)? myself|cut(ting)? myself|no reason to live|"
    r"(don'?t|do not) (see|have) (the|any) point( anymore| in living)?|hopeless)\b",
    re.IGNORECASE,
)

# Sent when a turn hits CHAT_LIMITS (a runaway tool loop).
LIMIT_REPLY = (
    "Sorry, that question needed more lookups than I'm allowed in one go. Could you ask "
    "about one item or category at a time?"
)

# Only the most recent turns are sent back to the model, to keep cost steady.
MAX_HISTORY_TURNS = 12

# Running totals for the honesty guard, shown at GET /api/health.
GUARD_STATS = {"replies_checked": 0, "corrections_requested": 0, "unverified_fallbacks": 0}

PRICE_PATTERN = re.compile(r"\$\s?(\d{1,4}(?:\.\d{1,2})?)")
QUANTITY_PATTERN = re.compile(
    r"\b(\d{1,4})\s+(?:left|available|in stock|units?|remaining)\b", re.IGNORECASE
)
# "We have 27 hoodies", "12 styles", "5 options": how many items a reply claims.
ITEM_COUNT_PATTERN = re.compile(
    r"\b(\d{1,3})\s+(?:[a-z-]+\s+){0,2}?(?:hoodies|crewnecks|sweatshirts|tees|t-shirts|shirts|"
    r"quarter-zips|jackets|items|styles|options|products|pieces|picks)\b",
    re.IGNORECASE,
)


@dataclass
class ChatDeps:
    """What the agent knows about this message beyond its text."""

    # The signed-in shopper, loaded from the users table; None for guests.
    customer: CustomerProfile | None = None
    # Where the shopper is on the site, as reported by the browser.
    page: PageContext | None = None
    # The product on the page, if they are on a product page and the id is real.
    page_product: ProductDescription | None = None
    # Everything the shopper wrote in this conversation, so figures they gave
    # ("under $60") are not mistaken for invented ones.
    shopper_text: str = ""
    # Facts the tools returned this turn (plus earlier cards and the page
    # product). The honesty guard only accepts figures from these.
    known_ids: set[str] = field(default_factory=set)
    known_prices: set[float] = field(default_factory=set)
    known_quantities: set[int] = field(default_factory=set)
    # How many results tools returned, and catalogue counts.
    known_counts: set[int] = field(default_factory=set)

    def remember(self, product_id: str, price: float | None = None) -> None:
        self.known_ids.add(product_id)
        if price is not None:
            self.known_prices.add(round(price, 2))


agent = Agent(
    model,
    deps_type=ChatDeps,
    output_type=ShopReply,
    retries=2,
)


def describe_customer(customer: CustomerProfile | None) -> str:
    if customer is None:
        return (
            "- The shopper is a guest (not signed in). Nothing from this chat is saved, and "
            "you have no name or account details for them."
        )
    returning = (
        f"They have {customer.saved_messages} saved messages; last chat {customer.last_chat_at} UTC."
        if customer.saved_messages
        else "This is their first chat with us."
    )
    return (
        f"- Signed in as {customer.full_name} (first name {customer.first_name}), "
        f"email {customer.email}, customer since {customer.member_since[:10]}.\n"
        f"- {returning} Earlier messages from their saved history are included above.\n"
        "- Call get_customer_profile for these fields and search_past_chats for older "
        "conversations not shown above."
    )


def describe_page(page: PageContext | None, product: ProductDescription | None) -> str:
    if page is None:
        return "- Unknown page."
    lines = [f"- Page: {page.page_type} ({page.path})."]
    if product is not None:
        colors = ", ".join(product.colors)
        lines.append(
            f"- They are looking at {product.name} (product_id {product.product_id}, "
            f"{product.garment_type}, colours: {colors}). \"this\", \"it\" or \"this one\" "
            "means this product unless they name another."
        )
    elif page.product_id:
        lines.append(f"- The page's product id {page.product_id!r} is not in the catalogue.")
    if page.category:
        lines.append(f"- The Products page is filtered to {page.category}.")
    return "\n".join(lines)


@agent.instructions
def shop_instructions(ctx: RunContext[ChatDeps]) -> str:
    # Read on every run, so edits to prompt.md apply without a restart.
    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    return (
        f"{prompt}\n\n## This conversation\n\n"
        f"Shopper:\n{describe_customer(ctx.deps.customer)}\n\n"
        f"Current page:\n{describe_page(ctx.deps.page, ctx.deps.page_product)}"
    )


@agent.tool
def search_products(
    ctx: RunContext[ChatDeps],
    query: str = "",
    category: Category | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    limit: int = 12,
) -> list[ProductSummary]:
    """Find products. Returns product_id, name, type, price, colours and whether
    any size is in stock, best match first. The ids you return in product_ids
    become product cards on the website. Use get_price, check_stock or
    get_product_description for exact facts about one item.

    Args:
        query: Keywords such as "navy hoodie", "hockey", "vintage bulldog" or a
            residential college. Leave empty to list a whole category or filter only.
        category: One of hoodies, crewnecks, tees, quarter-zips, jackets. Use it
            when the shopper asks about a type of item ("what hoodies do you have?").
        color: Only products that come in this colour, e.g. "gray".
        size: Only products with stock in this size (XS, S, M, L, XL, XXL or
            words like "medium"). Do not use it to check a product the shopper
            named, because a sold-out size hides the product; use check_stock.
        max_price: Only products at or below this price in US dollars.
        in_stock_only: Only products with stock in at least one size.
        limit: How many results, up to 30. Use 30 to list a whole category.
    """
    results = tools.search_products(
        query=query,
        category=category,
        color=color,
        size=size,
        max_price=max_price,
        in_stock_only=in_stock_only,
        limit=min(limit, MAX_RESULTS),
    )
    for item in results:
        ctx.deps.remember(item.product_id, item.price)
    ctx.deps.known_counts.add(len(results))
    return results


@agent.tool
def get_product_description(
    ctx: RunContext[ChatDeps], product_id: str
) -> ProductDescription | ProductNotFound:
    """The catalogue description and colours of one product: graphic, fabric
    details, fit features. Use for "what does it look like?" or "tell me more".

    Args:
        product_id: The product_id from search_products (an exact name also works).
    """
    result = tools.product_description(product_id)
    if isinstance(result, ProductDescription):
        ctx.deps.remember(result.product_id)
    return result


@agent.tool
def get_price(ctx: RunContext[ChatDeps], product_id: str) -> PriceInfo | ProductNotFound:
    """The current price of one product in US dollars, from the database.
    Call it whenever the shopper asks what one specific item costs.

    Args:
        product_id: The product_id from search_products (an exact name also works).
    """
    result = tools.product_price(product_id)
    if isinstance(result, PriceInfo):
        ctx.deps.remember(result.product_id, result.price)
    return result


@agent.tool
def check_stock(
    ctx: RunContext[ChatDeps], product_id: str, size: str | None = None
) -> StockReport | ProductNotFound:
    """How many units are in stock for one product, for every size, with a
    status of in_stock, low_stock (5 or fewer) or sold_out. Pass the size when
    the shopper asks about one; the result then includes requested_size_status
    and a plain-sentence note.

    Args:
        product_id: The product_id from search_products (an exact name also works).
        size: The size asked about, e.g. "M", "medium" or "XXL". Leave empty for all sizes.
    """
    result = tools.check_stock(product_id, size)
    if isinstance(result, StockReport):
        ctx.deps.remember(result.product_id)
        ctx.deps.known_quantities.update(s.quantity for s in result.sizes)
        ctx.deps.known_quantities.add(result.total_stock)
    return result


@agent.tool
def find_alternatives(
    ctx: RunContext[ChatDeps], product_id: str, size: str | None = None
) -> list[Alternative] | ProductNotFound:
    """Up to 4 similar products that are in stock, for when an item, or the
    size the shopper wants, is sold out. Ranked by same type of garment, shared
    colours and shared theme (sport, college, bulldog…), then closest price.
    One call replaces a search plus several stock checks.

    Args:
        product_id: The sold-out (or not-quite-right) product.
        size: The size the shopper needs; then every alternative has stock in
            that size and quantity_in_size says how many.
    """
    result = tools.find_alternatives(product_id, size)
    if isinstance(result, list):
        for alt in result:
            ctx.deps.remember(alt.product_id, alt.price)
            if alt.quantity_in_size is not None:
                ctx.deps.known_quantities.add(alt.quantity_in_size)
    return result


@agent.tool
def get_customer_profile(ctx: RunContext[ChatDeps]) -> CustomerProfile | dict:
    """The signed-in shopper's name, email, customer-since date and chat
    summary. Use when they ask about their own account ("what email am I
    signed in with?"). Returns an error for guests."""
    if ctx.deps.customer is None:
        return {"error": "The shopper is a guest; there is no account to look up."}
    # Re-read so the counts are current.
    return tools.customer_profile(ctx.deps.customer.user_id) or ctx.deps.customer


@agent.tool
def search_past_chats(ctx: RunContext[ChatDeps], query: str = "") -> list[PastChatMessage] | dict:
    """Search this signed-in shopper's own saved chat history, newest first,
    for older conversations not already in the messages above ("the hoodie you
    showed me last week"). Returns at most 6 messages.

    Args:
        query: Words to look for in past messages and product cards, e.g.
            "bulldog crewneck". Leave empty for the latest messages.
    """
    if ctx.deps.customer is None:
        return {"error": "The shopper is a guest; guest chats are not saved."}
    return tools.search_past_chats(ctx.deps.customer.user_id, query)


@agent.tool
def catalogue_overview(ctx: RunContext[ChatDeps]) -> dict:
    """How many products we carry, counts by garment type, the price range and
    the sizes offered. Use for broad questions like "what do you sell?"."""
    overview = tools.catalogue_overview()
    ctx.deps.known_prices.update(overview["price_range"].values())
    ctx.deps.known_counts.update(overview["garment_types"].values())
    ctx.deps.known_counts.update(overview["category_counts"].values())
    ctx.deps.known_counts.add(overview["product_count"])
    return overview


def _numbers(text: str) -> set[float]:
    return {float(n) for n in re.findall(r"\d+(?:\.\d+)?", text)}


@agent.output_validator
def honesty_guard(ctx: RunContext[ChatDeps], output: ShopReply) -> ShopReply:
    """Reject a reply whose prices, stock counts or product ids did not come
    from the tools, or that claims a different number of items than it shows,
    so the agent corrects it (up to the agent's retry limit)."""
    deps = ctx.deps
    GUARD_STATS["replies_checked"] += 1
    shopper_numbers = _numbers(deps.shopper_text)
    problems = []

    missing = [pid for pid in output.product_ids if tools.get_product(pid) is None]
    if missing:
        problems.append(
            f"product_ids {missing} are not in the catalogue; remove them and do not mention them"
        )

    for raw in PRICE_PATTERN.findall(output.reply):
        price = round(float(raw), 2)
        if price not in deps.known_prices and price not in shopper_numbers:
            problems.append(
                f"${raw} does not match any price a tool returned this turn "
                f"(known prices: {sorted(deps.known_prices) or 'none yet'})"
            )

    for raw in QUANTITY_PATTERN.findall(output.reply):
        quantity = int(raw)
        if quantity not in deps.known_quantities and quantity not in shopper_numbers:
            problems.append(
                f"'{raw} left/available' does not match any stock count a tool returned this turn"
            )

    shown = len(dict.fromkeys(output.product_ids))
    for raw in ITEM_COUNT_PATTERN.findall(output.reply):
        count = int(raw)
        if count != shown and count not in deps.known_counts and count not in shopper_numbers:
            problems.append(
                f"the reply says {raw} items but product_ids has {shown} and no tool returned "
                f"{raw}; state the number of items you are actually showing"
            )

    if problems:
        GUARD_STATS["corrections_requested"] += 1
        logger.warning("Honesty guard asked for a correction: %s", "; ".join(problems))
        raise ModelRetry(
            "Honesty check failed: "
            + "; ".join(problems)
            + ". Call get_price or check_stock for the exact figure, or leave the figure out."
        )
    return output


def to_model_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Turn the website's chat turns into PydanticAI messages."""
    messages: list[ModelMessage] = []
    for turn in history[-MAX_HISTORY_TURNS:]:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            content = turn.content
            if turn.product_ids:
                # Lets follow-ups like "is the first one in M?" find the right item.
                content += "\n\n(Product cards shown: " + ", ".join(turn.product_ids) + ")"
            messages.append(ModelResponse(parts=[TextPart(content=content)]))
    return messages


async def run_chat(
    message: str,
    history: list[ChatTurn],
    customer: CustomerProfile | None = None,
    page: PageContext | None = None,
) -> ChatResponse:
    """Answer one chat message.

    For a signed-in customer, `history` should be their saved messages from
    chat_messages; for a guest, the turns their browser sent.
    """
    page_product = None
    if page and page.product_id:
        found = tools.product_description(page.product_id)
        # Only a real catalogue row becomes "this"; a made-up id is ignored.
        page_product = found if isinstance(found, ProductDescription) else None
    deps = ChatDeps(
        customer=customer,
        page=page,
        page_product=page_product,
        shopper_text=" ".join([*(t.content for t in history if t.role == "user"), message]),
    )
    # Earlier product cards and the page product count as known facts, with
    # their current database prices.
    for product_id in [*(pid for t in history for pid in t.product_ids),
                       *([page_product.product_id] if page_product else [])]:
        product = tools.get_product(product_id)
        if product is not None:
            deps.remember(product.product_id, product.price)
    started = time.perf_counter()
    entry = {
        "run_id": uuid.uuid4().hex[:12],
        "time": audit.now_iso(),
        "model": MODEL_NAME,
        "shopper": f"user:{customer.user_id}" if customer else "guest",
        "page": page.path if page else None,
        "page_product": page_product.product_id if page_product else None,
        "message": audit.short(message, 200),
        "history_turns": len(history[-MAX_HISTORY_TURNS:]),
    }
    response: ChatResponse | None = None
    usage = None
    if CRISIS_PATTERN.search(message):
        response = ChatResponse(reply=CRISIS_REPLY, products=[])
        _record(entry, [], started, "crisis_support", None, response)
        return response
    with capture_run_messages() as run_messages:
        try:
            result = await agent.run(
                message,
                deps=deps,
                message_history=to_model_history(history),
                usage_limits=CHAT_LIMITS,
            )
            usage = result.usage
            stop_reason = "final_answer"
        except ModelHTTPError as error:
            if "content_filter" not in str(error.body):
                _record(entry, run_messages, started, "error", None, None, repr(error))
                raise
            stop_reason = "content_filter"
            response = ChatResponse(reply=FILTERED_REPLY, products=[])
        except UsageLimitExceeded as error:
            stop_reason = "usage_limit"
            entry["error"] = str(error)
            response = ChatResponse(reply=LIMIT_REPLY, products=[])
        except UnexpectedModelBehavior:
            # The guard still found a wrong figure after every retry: say so
            # rather than show it.
            GUARD_STATS["unverified_fallbacks"] += 1
            logger.warning("Honesty guard: no verified reply after retries")
            stop_reason = "unverified_fallback"
            response = ChatResponse(reply=UNVERIFIED_REPLY, products=[])
        except Exception as error:
            _record(entry, run_messages, started, "error", None, None, repr(error))
            raise

    if response is None:
        output: ShopReply = result.output
        # Show only real products, once each, in the agent's order.
        products = []
        for product_id in dict.fromkeys(output.product_ids):
            product = tools.get_product(product_id)
            if product is not None:
                products.append(product)
        dropped = [pid for pid in output.product_ids if tools.get_product(pid) is None]
        if dropped:
            entry["dropped_product_ids"] = dropped
        response = ChatResponse(
            reply=output.reply.strip(),
            results_title=(output.results_title or "Matching items") if products else None,
            products=products,
        )
    _record(entry, run_messages, started, stop_reason, usage, response)
    return response


def _record(
    entry: dict,
    run_messages: list,
    started: float,
    stop_reason: str,
    usage,
    response: ChatResponse | None,
    error: str | None = None,
) -> None:
    """Finish one audit entry and append it; never let auditing break a chat."""
    try:
        steps, retries, finish_reason = audit.loop_steps(run_messages)
        entry.update(
            {
                "tool_calls": steps,
                "guard_retries": retries,
                "stop_reason": stop_reason,
                "model_finish_reason": finish_reason,
                "model_requests": usage.requests if usage else None,
                "input_tokens": usage.input_tokens if usage else None,
                "output_tokens": usage.output_tokens if usage else None,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            }
        )
        if response is not None:
            entry["reply"] = audit.short(response.reply, 300)
            entry["product_ids_shown"] = [p.product_id for p in response.products]
        if error:
            entry["error"] = audit.short(error, 300)
        audit.append_entry(entry)
    except Exception:
        logger.exception("Could not write the audit trail entry")

