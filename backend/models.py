"""Pydantic and PydanticAI types shared by the API, the tools and the agent."""

from typing import Literal

from pydantic import BaseModel, Field

# Most product cards one chat reply can put on the page. The largest category
# (crewnecks) has 29 items, so any full category fits in one reply.
MAX_RESULTS = 30

Category = Literal["hoodies", "crewnecks", "tees", "quarter-zips", "jackets"]

# ---------- Products (API responses and chat product cards) ----------


class SizeStock(BaseModel):
    size: str
    quantity: int


class Product(BaseModel):
    """A catalogue row with its stock, in the shape the frontend renders."""

    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str]
    search_tags: list[str]
    image_file_path: str
    image_url: str
    price: float
    inventory: list[SizeStock]
    total_stock: int


# ---------- Agent tool results ----------
# Each lookup tool returns only the fields its question needs, read from the
# database on every call. Fewer fields mean fewer tokens and less for the model
# to misread.


class ProductSummary(BaseModel):
    """A search hit: enough to pick the right item and quote a price in a list.
    Stock by size comes from check_stock, not from here."""

    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    in_stock: bool = Field(description="True if at least one size has stock.")


class ProductDescription(BaseModel):
    """get_product_description: what the item looks like."""

    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str]


class PriceInfo(BaseModel):
    """get_price: the catalogue price."""

    product_id: str
    name: str
    price: float
    currency: Literal["USD"] = "USD"


StockStatus = Literal["in_stock", "low_stock", "sold_out"]


class SizeStatus(BaseModel):
    size: str
    quantity: int
    status: StockStatus


class StockReport(BaseModel):
    """check_stock: units on hand per size, plus the size the shopper asked about."""

    product_id: str
    name: str
    requested_size: str | None = Field(
        description="The size asked about, normalised (e.g. 'medium' -> 'M'), or None."
    )
    requested_size_status: SizeStatus | None = Field(
        description="Stock for requested_size; None if no size was asked or we do not offer it."
    )
    sizes: list[SizeStatus] = Field(description="Every size, XS to XXL.")
    total_stock: int
    note: str = Field(description="One plain sentence summarising the answer.")


class Alternative(BaseModel):
    """find_alternatives: a similar product that is in stock (in the requested
    size, if one was given)."""

    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    quantity_in_size: int | None = Field(
        description="Units in the requested size; None if no size was requested."
    )
    why_similar: str = Field(description="Short reason, e.g. 'also a hoodie; also navy'.")
    stock_note: str = Field(
        description="This item's own stock, e.g. '20 in stock in M' or 'only 5 left in M'."
    )


class ProductNotFound(BaseModel):
    """Returned instead of a result when the product id or name is unknown."""

    error: str
    product_ref: str


# ---------- Chat ----------


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)
    # For assistant turns: the product cards that were shown with the reply.
    product_ids: list[str] = Field(default_factory=list, max_length=MAX_RESULTS)


PageType = Literal["home", "products", "product", "about", "login", "create-account", "other"]


class PageContext(BaseModel):
    """Where the shopper is on the site when they send a message, so "this"
    and "it" can be resolved. Sent by the browser, so the backend checks
    product_id against the database before trusting it."""

    path: str = Field(default="/", max_length=200)
    page_type: PageType = "other"
    product_id: str | None = Field(
        default=None, max_length=120, description="Set on a product page (/products/<id>)."
    )
    category: str | None = Field(
        default=None, max_length=40, description="The Products page category filter, if any."
    )


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    # Earlier turns, oldest first, so the agent can follow up ("do you have
    # that in medium?"). Used for guests only: a signed-in shopper's history is
    # read from chat_messages instead.
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)
    page: PageContext | None = None


# ---------- Customer memory ----------


class CustomerProfile(BaseModel):
    """Who is chatting: put in the agent's deps for signed-in shoppers and
    returned by the get_customer_profile tool. Never includes password_hash."""

    user_id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    member_since: str = Field(description="When the account was created (UTC).")
    saved_messages: int = Field(description="Messages already saved in chat_messages.")
    last_chat_at: str | None = Field(description="When they last chatted (UTC), if ever.")


class PastChatMessage(BaseModel):
    """One saved message found by search_past_chats."""

    role: Literal["user", "assistant"]
    content: str
    product_names: list[str] = Field(description="Product cards shown with this message.")
    created_at: str


class ShopReply(BaseModel):
    """The agent's structured output for every chat turn.

    This is the API contract for search results: the agent names the matching
    products by id, and the website renders them as product cards on the page.
    """

    reply: str = Field(description="What to say to the shopper, in the Campus Customs voice.")
    results_title: str | None = Field(
        default=None,
        description=(
            "A short heading for the product cards shown on the page, e.g. 'Hoodies' or "
            "'Navy items under $60'. None when product_ids is empty."
        ),
    )
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=MAX_RESULTS,
        description=(
            "product_id values, copied exactly from tool results, of every item that matches "
            "the shopper's request, best match first. Empty when no product is relevant."
        ),
    )


class ChatResponse(BaseModel):
    """What POST /api/chat returns to the website.

    `products` are full Product rows read from the database for the agent's
    product_ids (unknown ids dropped), in the agent's order. The website shows
    them as product cards under `results_title`.
    """

    reply: str
    results_title: str | None = None
    products: list[Product]


class ChatMessageOut(BaseModel):
    """A saved chat message for a signed-in shopper (GET /api/chat/history)."""

    role: Literal["user", "assistant"]
    content: str
    products: list[Product]
    created_at: str
