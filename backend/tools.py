"""Database access used by the website and by the chat agent's tools.

Everything the agent says about price and stock comes from these functions,
which read data/campus_customs.db on every call, so answers always match the
database. The customer-memory functions at the end read and write the
signed-in shopper's profile and saved chat history.
"""

import json
import re
import sqlite3

from db import connect
from images import clean_path
from models import (
    MAX_RESULTS,
    Alternative,
    ChatMessageOut,
    ChatTurn,
    CustomerProfile,
    PastChatMessage,
    PriceInfo,
    Product,
    ProductDescription,
    ProductNotFound,
    ProductSummary,
    SizeStatus,
    SizeStock,
    StockReport,
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

# At or below this many units, a size is reported as low stock.
LOW_STOCK_THRESHOLD = 5

# How shoppers name sizes, mapped to the codes in the inventory table.
SIZE_ALIASES = {
    "extra small": "XS", "x-small": "XS", "xsmall": "XS",
    "small": "S",
    "medium": "M", "med": "M",
    "large": "L",
    "extra large": "XL", "x-large": "XL", "xlarge": "XL",
    "xxl": "XXL", "2xl": "XXL", "xx-large": "XXL", "xxlarge": "XXL",
    "double extra large": "XXL", "2x": "XXL",
}

# Words shoppers use that the catalogue spells differently.
SYNONYMS = {
    "tee": "t-shirt",
    "tshirt": "t-shirt",
    "shirt": "t-shirt",
    "sweater": "sweatshirt",
    "crew": "crewneck",
    "quarterzip": "quarter-zip",
    "coat": "jacket",
    "hood": "hoodie",
    "hooded": "hoodie",
    "grey": "gray",
}

STOPWORDS = {
    "a", "an", "and", "any", "are", "do", "for", "have", "i", "in", "is", "it", "me",
    "of", "on", "or", "show", "some", "the", "to", "what", "with", "you", "your", "yale",
    "campus", "customs", "merch", "something", "looking",
}


def size_rank(size: str) -> int:
    return SIZE_ORDER.index(size) if size in SIZE_ORDER else len(SIZE_ORDER)


def _inventory_by_product(conn: sqlite3.Connection) -> dict[str, list[SizeStock]]:
    by_product: dict[str, list[SizeStock]] = {}
    for row in conn.execute("SELECT product_id, size, quantity FROM inventory"):
        by_product.setdefault(row["product_id"], []).append(
            SizeStock(size=row["size"], quantity=row["quantity"])
        )
    for sizes in by_product.values():
        sizes.sort(key=lambda item: size_rank(item.size))
    return by_product


def image_url(image_file_path: str) -> str:
    """The cleaned copy (black background made transparent) when there is one,
    otherwise the original photo. image_file_path in the database is unchanged."""
    cleaned = clean_path(image_file_path)
    if cleaned.exists():
        return f"/media/products_clean/{cleaned.name}"
    return f"/media/{image_file_path}"


def _product(row: sqlite3.Row, inventory: list[SizeStock]) -> Product:
    return Product(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        # colors and search_tags are stored as JSON text in the database.
        colors=json.loads(row["colors"]),
        search_tags=json.loads(row["search_tags"]),
        image_file_path=row["image_file_path"],
        image_url=image_url(row["image_file_path"]),
        price=row["price"],
        inventory=inventory,
        total_stock=sum(item.quantity for item in inventory),
    )


def load_products() -> list[Product]:
    """Every catalogue product with stock by size, sorted by name."""
    with connect() as conn:
        inventory = _inventory_by_product(conn)
        rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
    return [_product(row, inventory.get(row["product_id"], [])) for row in rows]


def get_product(product_id: str) -> Product | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            return None
        stock = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()
    inventory = sorted(
        (SizeStock(size=s["size"], quantity=s["quantity"]) for s in stock),
        key=lambda item: size_rank(item.size),
    )
    return _product(row, inventory)


def resolve_product(product_ref: str) -> Product | None:
    """Find a product by product_id, or failing that by exact name
    (case-insensitive), so a slightly wrong reference still finds the row."""
    ref = product_ref.strip()
    product = get_product(ref)
    if product is not None:
        return product
    with connect() as conn:
        row = conn.execute(
            "SELECT product_id FROM catalogue WHERE lower(name) = lower(?)", (ref,)
        ).fetchone()
    return get_product(row["product_id"]) if row else None


def not_found(product_ref: str) -> ProductNotFound:
    return ProductNotFound(
        error="No product with that id or name. Use search_products to find the right product_id.",
        product_ref=product_ref,
    )


def normalize_size(size: str) -> str:
    text = size.strip().lower()
    return SIZE_ALIASES.get(text, text.upper())


def size_status(item: SizeStock) -> SizeStatus:
    if item.quantity == 0:
        status = "sold_out"
    elif item.quantity <= LOW_STOCK_THRESHOLD:
        status = "low_stock"
    else:
        status = "in_stock"
    return SizeStatus(size=item.size, quantity=item.quantity, status=status)


def product_description(product_ref: str) -> ProductDescription | ProductNotFound:
    product = resolve_product(product_ref)
    if product is None:
        return not_found(product_ref)
    return ProductDescription(
        product_id=product.product_id,
        name=product.name,
        garment_type=product.garment_type,
        description=product.description,
        colors=product.colors,
    )


def product_price(product_ref: str) -> PriceInfo | ProductNotFound:
    product = resolve_product(product_ref)
    if product is None:
        return not_found(product_ref)
    return PriceInfo(product_id=product.product_id, name=product.name, price=product.price)


def check_stock(product_ref: str, size: str | None = None) -> StockReport | ProductNotFound:
    """Units on hand for every size of one product, with a plain-sentence note
    about the size the shopper asked for."""
    product = resolve_product(product_ref)
    if product is None:
        return not_found(product_ref)

    sizes = [size_status(item) for item in product.inventory]
    in_stock = [s.size for s in sizes if s.quantity > 0]
    sold_out = [s.size for s in sizes if s.quantity == 0]
    requested = normalize_size(size) if size else None
    requested_status = next((s for s in sizes if s.size == requested), None)
    requested_sold_out = requested_status is not None and requested_status.status == "sold_out"

    if requested and requested_status is None:
        note = (
            f"We do not offer size {size!r} for {product.name}; sizes are "
            f"{', '.join(SIZE_ORDER)}."
        )
    elif requested_sold_out:
        note = f"{product.name} is sold out in {requested}."
        if in_stock:
            note += f" Still in stock in: {', '.join(in_stock)}."
    elif requested_status:
        note = f"{product.name} has {requested_status.quantity} in stock in {requested}."
    elif product.total_stock == 0:
        note = f"{product.name} is sold out in every size."
    else:
        note = f"{product.name} is in stock in {', '.join(in_stock)}."
    if sold_out and product.total_stock > 0 and not requested_sold_out:
        note += f" Sold out in: {', '.join(sold_out)}."

    return StockReport(
        product_id=product.product_id,
        name=product.name,
        requested_size=requested,
        requested_size_status=requested_status,
        sizes=sizes,
        total_stock=product.total_stock,
        note=note,
    )


def summarize(product: Product) -> ProductSummary:
    return ProductSummary(
        product_id=product.product_id,
        name=product.name,
        garment_type=product.garment_type,
        price=product.price,
        colors=product.colors,
        in_stock=product.total_stock > 0,
    )


def _terms(query: str) -> list[str]:
    """Lower-case search words with stopwords dropped, plurals trimmed and
    common shopper words mapped onto catalogue wording."""
    terms = []
    for word in re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", query.lower()):
        if word in STOPWORDS:
            continue
        if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
            word = word[:-1]
        terms.append(SYNONYMS.get(word, word))
    return terms


def category_of(product: Product) -> str:
    """Group the catalogue's inconsistent garment_type labels into the five
    shopper-facing categories (same rules as categoryOf in frontend/src/api.ts)."""
    kind = product.garment_type.lower()
    if "quarter-zip" in kind:
        return "quarter-zips"
    if "jacket" in kind:
        return "jackets"
    if "hood" in kind:
        return "hoodies"
    if "t-shirt" in kind or "performance shirt" in kind:
        return "tees"
    return "crewnecks"


def search_products(
    query: str = "",
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    limit: int = 12,
) -> list[ProductSummary]:
    """Rank products by how many search words appear in their name, type,
    description, colours and tags, then apply the filters."""
    terms = _terms(query)
    color_term = color.lower().replace("grey", "gray").strip() if color else None
    size_term = normalize_size(size) if size else None

    scored: list[tuple[int, Product]] = []
    for product in load_products():
        if category and category_of(product) != category:
            continue
        if max_price is not None and product.price > max_price:
            continue
        if color_term and not any(color_term in c.lower() for c in product.colors):
            continue
        if size_term:
            stock = next((s.quantity for s in product.inventory if s.size == size_term), 0)
            if stock == 0:
                continue
        if in_stock_only and product.total_stock == 0:
            continue

        haystack = " ".join(
            [product.name, product.garment_type, product.description, *product.colors,
             *product.search_tags]
        ).lower()
        score = sum(1 for term in terms if term in haystack)
        if terms and score == 0:
            continue
        # Words in the name or garment type count double.
        title = f"{product.name} {product.garment_type}".lower()
        score += sum(1 for term in terms if term in title)
        scored.append((score, product))

    scored.sort(key=lambda pair: (-pair[0], pair[1].name))
    return [summarize(product) for _, product in scored[: max(1, min(limit, MAX_RESULTS))]]


# Catalogue colour names grouped into families shoppers think in. Checked in
# order, so "navy blue" lands in navy rather than blue.
COLOR_FAMILIES = [
    ("navy", ("navy",)),
    ("blue", ("blue",)),
    ("gray", ("gray", "grey", "charcoal")),
    ("white", ("white", "cream", "ivory")),
    ("black", ("black",)),
    ("red", ("red", "coral")),
    ("yellow", ("yellow", "gold")),
    ("green", ("green",)),
]


def color_family(color: str) -> str:
    text = color.lower()
    for family, words in COLOR_FAMILIES:
        if any(word in text for word in words):
            return family
    return "other"


# Words in nearly every name or tag, which say nothing about style.
GENERIC_WORDS = {
    "apparel", "college", "chest", "left", "logo", "graphic", "hoodie", "hoodies", "crewneck",
    "sweatshirt", "pullover", "shirt", "sleeve", "long", "short", "tshirt", "jacket", "zip",
    "full", "quarter", "fleece", "lettering", "wordmark", "pocket", "kangaroo", "drawstring",
    "hood", "navy", "blue", "gray", "white", "heather", "school", "sports",
}

CATEGORY_LABELS = {
    "hoodies": "a hoodie",
    "crewnecks": "a crewneck",
    "tees": "a tee",
    "quarter-zips": "a quarter-zip",
    "jackets": "a jacket",
}


def _words(product: Product) -> set[str]:
    text = " ".join([product.name, *product.search_tags]).lower()
    return {w for w in re.findall(r"[a-z]+", text) if len(w) > 3} - STOPWORDS - GENERIC_WORDS


def _stock_note(quantity: int, size: str | None) -> str:
    where = f" in {size}" if size else " across all sizes"
    if quantity <= LOW_STOCK_THRESHOLD:
        return f"only {quantity} left{where}"
    return f"{quantity} in stock{where}"


def find_alternatives(
    product_ref: str, size: str | None = None, limit: int = 4
) -> list[Alternative] | ProductNotFound:
    """Similar in-stock products for when an item, or a size of it, is sold out.

    Candidates must be in stock (in `size`, if given). They are ranked by: same
    shopper category (hoodie, crewneck…), shared colour families, shared name
    and tag words (sport, college, "vintage bulldog"…), then closest price.
    """
    base = resolve_product(product_ref)
    if base is None:
        return not_found(product_ref)
    wanted = normalize_size(size) if size else None
    base_category = category_of(base)
    base_families = {color_family(c) for c in base.colors}
    base_words = _words(base)

    ranked: list[tuple[float, Alternative]] = []
    for product in load_products():
        if product.product_id == base.product_id:
            continue
        if wanted:
            quantity = next((s.quantity for s in product.inventory if s.size == wanted), 0)
            if quantity == 0:
                continue
        elif product.total_stock == 0:
            continue

        reasons = []
        score = 0.0
        if category_of(product) == base_category:
            score += 3
            reasons.append(f"also {CATEGORY_LABELS[base_category]}")
        shared_colors = base_families & {color_family(c) for c in product.colors}
        if shared_colors:
            score += len(shared_colors)
            reasons.append("also in " + "/".join(sorted(shared_colors)))
        shared_words = base_words & _words(product)
        if shared_words:
            score += min(len(shared_words), 2) * 1.5
            reasons.append("same " + ", ".join(sorted(shared_words)[:2]) + " theme")
        # Small tie-breaker: closer prices rank higher.
        score -= abs(product.price - base.price) / 100
        if score <= 0:
            continue
        ranked.append(
            (
                score,
                Alternative(
                    product_id=product.product_id,
                    name=product.name,
                    garment_type=product.garment_type,
                    price=product.price,
                    colors=product.colors,
                    quantity_in_size=quantity if wanted else None,
                    why_similar="; ".join(reasons) or "similar style",
                    stock_note=_stock_note(quantity if wanted else product.total_stock, wanted),
                ),
            )
        )
    ranked.sort(key=lambda pair: (-pair[0], pair[1].name))
    return [alt for _, alt in ranked[: max(1, min(limit, 8))]]


def catalogue_overview() -> dict:
    """Counts by garment type and the price range, for broad questions like
    "what do you sell?"."""
    products = load_products()
    types: dict[str, int] = {}
    for product in products:
        key = product.garment_type.lower()
        types[key] = types.get(key, 0) + 1
    prices = [p.price for p in products]
    categories: dict[str, int] = {}
    for product in products:
        categories[category_of(product)] = categories.get(category_of(product), 0) + 1
    return {
        "product_count": len(products),
        # Shopper-facing categories, the same grouping as the website's filters.
        "category_counts": categories,
        "garment_types": dict(sorted(types.items(), key=lambda kv: -kv[1])),
        "price_range": {"min": min(prices), "max": max(prices)},
        "sizes": SIZE_ORDER,
    }


# ---------- Customer memory ----------


def customer_profile(user_id: int) -> CustomerProfile | None:
    """The signed-in shopper's account fields plus a summary of their saved chats."""
    with connect() as conn:
        row = conn.execute(
            "SELECT id, name, first_name, last_name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        stats = conn.execute(
            "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM chat_messages WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    # Seed rows may lack first/last name, so fall back to splitting `name`.
    first, _, last = row["name"].partition(" ")
    return CustomerProfile(
        user_id=row["id"],
        first_name=row["first_name"] or first,
        last_name=row["last_name"] or last,
        full_name=row["name"],
        email=row["email"],
        member_since=row["created_at"],
        saved_messages=stats["n"],
        last_chat_at=stats["last"],
    )


def _saved_product_ids(products_json: str | None) -> list[str]:
    return [item["product_id"] for item in json.loads(products_json)] if products_json else []


def save_chat_message(
    conn: sqlite3.Connection, user_id: int, role: str, content: str, products: list[Product]
) -> None:
    """Write one message to chat_messages. Products are saved as a JSON snapshot
    (the same shape as the seed rows); readers re-fetch them by product_id."""
    products_json = json.dumps([p.model_dump() for p in products]) if products else None
    conn.execute(
        "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, ?, ?, ?)",
        (user_id, role, content, products_json),
    )


def _recent_rows(user_id: int, limit: int) -> list[sqlite3.Row]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return list(reversed(rows))


def recent_chat_turns(user_id: int, limit: int) -> list[ChatTurn]:
    """The shopper's latest saved messages, oldest first, as agent history."""
    return [
        ChatTurn(
            role=row["role"],
            content=row["content"],
            product_ids=_saved_product_ids(row["products_json"])[:MAX_RESULTS],
        )
        for row in _recent_rows(user_id, limit)
    ]


def saved_chat_history(user_id: int, limit: int) -> list[ChatMessageOut]:
    """The shopper's latest saved messages for the chat widget, with products
    re-read so prices and stock are current, not as of when they were sent."""
    messages = []
    for row in _recent_rows(user_id, limit):
        products = [
            product
            for product in (get_product(pid) for pid in _saved_product_ids(row["products_json"]))
            if product is not None
        ]
        messages.append(
            ChatMessageOut(
                role=row["role"],
                content=row["content"],
                products=products,
                created_at=row["created_at"],
            )
        )
    return messages


def search_past_chats(user_id: int, query: str, limit: int = 6) -> list[PastChatMessage]:
    """Saved messages from this shopper whose text or product cards mention any
    search word, newest first. Only ever reads the given user's rows."""
    terms = _terms(query)
    with connect() as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()

    found = []
    for row in rows:
        names = [item["name"] for item in json.loads(row["products_json"] or "[]")]
        text = " ".join([row["content"], *names]).lower()
        if not terms or any(term in text for term in terms):
            found.append(
                PastChatMessage(
                    role=row["role"],
                    content=row["content"][:600],
                    product_names=names[:10],
                    created_at=row["created_at"],
                )
            )
        if len(found) >= limit:
            break
    return found
