# Usability Improvements

Four improvements to the Campus Customs site: two on the frontend and two in the agent and backend. Each section says what was added, why it helps a Campus Customs shopper or the business, and where to see it in the running app. All four were tested in the browser against the live database; screenshots are in `output/screenshots/p9-*.png`.

| # | Improvement | Type | Where to see it |
|---|---|---|---|
| 1 | Refine and sort on the Products page | Frontend | **Products** page: size, price and colour filters, sort, filter chips |
| 2 | Chat shortcuts | Frontend | Chat panel (suggested questions) and any product page ("Ask our assistant about size …") |
| 3 | Sold-out rescue: similar styles in stock | Agent and backend | Any product page ("Similar styles in stock") and the chat when a size is sold out |
| 4 | Honesty guard on every chat reply | Agent and backend | Every chat reply; running totals at `/api/health` |

---

## 1. Refine and sort on the Products page (frontend)

### What we added

A refine bar on the Products page, under the category buttons, like the filter rail on a mature retail site:

- **Size:** show only items **in stock** in that size (XS–XXL). Sold-out sizes do not count, so every result can actually be bought in your size.
- **Price range:** a **Price** dropdown where shoppers type their own minimum and maximum (or tap a preset: Under $40, $40–$70, $70 & up) and press **Apply**. Either end can be left blank, the catalogue's lowest and highest prices ($32 and $98) are shown as hints, and a minimum above the maximum is rejected with a message.
- **Colour swatches:** Navy, Blue, Gray, White, Black, Red, Yellow & gold, Green. The catalogue has 22 different colour names ("navy blue", "heather charcoal gray", "cream"…), so they are grouped into the families shoppers think in.
- **In stock only** checkbox.
- **Sort:** name A–Z, price low to high, price high to low, or most in stock.
- **Active filter chips** (e.g. "In stock in M ×", "Navy ×", "$40–$70 ×") that remove one filter each, plus **Clear all**.
- A live count ("Showing 34 of 102 items") and a friendly empty state ("No items match those filters" with a **Clear all filters** button).
- **Shareable URLs:** every filter lives in the address bar, e.g. `/products?size=M&color=navy&min=40&max=70&sort=price-desc`, so a filtered view can be bookmarked or texted to a friend, and the browser's Back button undoes the last change.
- **Product cards now show colour swatch dots**, and when you filter by a size, a card warns **"Only 2 left in XL"** if stock in that size is low.

### Why it helps

- A shopper who wears a medium no longer clicks through 102 items to find out what fits; one dropdown shows only what is in stock in M.
- Students on a budget can sort by price or cap it at $40, and parents shopping for gifts can filter by colour.
- Low-stock badges create honest urgency, which helps sales, and avoid the frustration of falling for a sold-out item.
- Shareable links make it easy for families and teammates to shop together ("here are the navy crewnecks under $60").

### Check it

On **Products**, open **Price**, enter **$40** to **$70** and press **Apply**: 56 of 102 items, all priced $40–$70 (matches a direct database query). Add Size **M**, the **Navy** swatch and the **Hoodies** category, and sort **Price: high to low**: 17 items (also matches the database). Remove a chip, then press Back to restore it. `/products?category=jackets&max=35` (jackets up to $35) shows the empty state. `/products?size=XL` shows 21 "Only … left in XL" badges.

Screenshot: `p9-fe1-filters-and-sort.png`.

---

## 2. Chat shortcuts (frontend)

### What we added

- **Suggested questions** above the chat input, which change with the page:
  - Home and other pages: "What hoodies do you have?", "Show me gifts under $40", and "What is your return policy?" for guests or "What was I looking at last time?" for signed-in shoppers.
  - A product page: "Which sizes of this are in stock?", "What colours does this come in?", "Show me similar styles in stock".
  - A Products category (e.g. hoodies): "What hoodies do you have under $60?", "Which hoodies are in stock in M?".
  One tap sends the question.
- **"Ask our assistant" button on every product page.** It knows the size you selected: pick XL and it becomes **"Ask our assistant about size XL"**. Clicking it opens the chat and asks "Is the Fencing Left Chest Hoodie in stock in XL? What similar styles do you have in XL?" for you.
- An animated **typing indicator** while the assistant works.

### Why it helps

- Many shoppers do not know what a chatbot can do; the chips show its abilities (stock, sizes, gifts, returns) and remove the blank-box problem.
- On a product page the most common questions are about sizes and alternatives, so the shopper gets an answer in one tap instead of typing the product name.
- The size-aware button connects the page and the chat: the shopper never has to repeat what they are looking at.
- More questions answered means fewer abandoned visits and fewer emails to orderdept@campuscustoms.com.

### Check it

Open the chat on the home page and tap **Show me gifts under $40**: the agent finds 25 tees at $32 and they appear on the page under "Gifts under $40". On `/products/fencing-left-chest-hoodie`, select **XL**, then click **Ask our assistant about size XL**: the chat opens, sends the question and replies "in stock in XL, with only 2 left", with XL alternatives and their own counts (all checked against the database).

Screenshots: `p9-fe2-suggestion-chips.png`, `p9-fe2-ask-about-size.png`.

---

## 3. Sold-out rescue: similar styles in stock (agent and backend)

### What we added

- **New agent tool `find_alternatives(product_id, size)`** (`backend/agent.py`, logic in `backend/tools.py`). Given a sold-out item, or a sold-out size of it, it returns up to 4 similar products that are **in stock in that size**, each with its price, colours, units in that size, a reason it is similar, and its own stock sentence (e.g. "20 in stock in M"). Ranking: same type of garment, shared colour families, shared theme words from names and tags (hockey, bulldog, crest, a residential college…), then closest price. Generic words like "apparel" or "hoodie" are ignored so the theme match means something.
- **New endpoint `GET /api/products/{id}/alternatives?size=L`**, using the same ranking.
- **"Similar styles in stock" section on every product page.** If the item has sold-out sizes, it offers **"Need a size that's sold out here? [XS] [L] [XXL]"**; picking one reloads the section as **"Similar styles in stock in L"**, showing only items you can buy in L.
- The prompt now tells the agent to call `find_alternatives` whenever it reports a sold-out size.

### Why it helps

- A sold-out size used to be a dead end. Now the shopper is immediately shown what they *can* buy in their size, which keeps the sale for the business.
- It is faster and cheaper: one tool call replaces a search plus a stock check for every candidate, so fewer model round-trips per answer.
- The same ranking feeds the page and the chat, so they recommend the same items.

### Check it

On `/products/ice-hockey-left-chest-hoodie` (sold out in M, L and XL), or in the chat ask "Can I get the Ice Hockey Left Chest Hoodie in a medium?". The agent calls `search_products` → `check_stock(size="M")` → `find_alternatives(size="M")` and replies that it is sold out in M, still in stock in XS, S and XXL, and suggests the Yale Sports Hoodie Hockey (only 5 left in M), Basic Hoodie Big Yale (only 5 left), Champion Reverse Weave Hoodie 1 (20 in stock) and Squash Left Chest Hoodie (only 5 left), all $68 and all matching the database. On `/products/fencing-left-chest-hoodie`, click **L** under "Need a size that's sold out here?" to see four navy hoodies in stock in L.

A fix found while testing: an early version let the agent summarise four alternatives as "each with only 5 left in M", which was wrong for one of them (it has 20). Each alternative now carries its own `stock_note`, and the prompt forbids grouping different items under one stock number; two re-runs gave each item its correct count.

Screenshot: `p9-be1-similar-in-sold-out-size.png`.

---

## 4. Honesty guard on every chat reply (agent and backend)

### What we added

A PydanticAI **output validator** (`honesty_guard` in `backend/agent.py`) that checks every reply before the shopper sees it:

- Each tool records the facts it returned this turn (product ids, prices, stock counts) in the agent's deps. Earlier product cards and the product on the current page count too, at their current database prices.
- The guard scans the reply for **every dollar amount** and **every stock count** ("2 left", "15 available", "20 in stock") and rejects any figure that no tool returned. Figures the shopper typed ("under $60") are allowed.
- It rejects any **product id not in the catalogue**.
- It checks **item counts** ("27 hoodies", "5 options"): the number must match the product cards the reply shows, or a count a tool returned. (Added in Problem 11, after live testing caught a reply saying "28 hoodies" while showing 27.)
- On a mismatch it raises `ModelRetry` with the exact problem ("$29 does not match any price a tool returned this turn (known prices: [32.0])"), so the agent looks the figure up and answers again (up to 2 retries).
- If the agent still cannot give verified figures, the shopper gets a safe reply ("Sorry, I couldn't confirm exact prices and stock for that just now…") instead of a wrong one.
- **Running totals** of replies checked, corrections requested and fallbacks are shown at `GET /api/health`, e.g. `"honesty_guard": {"replies_checked": 2, "corrections_requested": 0, "unverified_fallbacks": 0}`.

### Why it helps

- Wrong prices and stock are the most damaging mistakes a shop chatbot can make: a shopper promised $29, or told a sold-out size is "available", loses trust, and the business may have to honour it. The guard turns "the prompt says don't invent numbers" into a check in code.
- It is safer against manipulation too: even if a message talks the model into quoting a made-up price, the figure fails the check.
- The health counters let the shop see how often the model needs correcting, a cheap signal for whether the prompt or model needs work.

### Check it

`python tests/test_honesty_guard.py` (from `backend/`) runs five scripted checks with no API cost: a reply quoting $29 for the $32 Boola Boola T Shirt is sent back and corrected to $32; a correct reply passes with no retry; a model that never corrects itself gets the safe fallback; a shopper's own "$60" is allowed; and "28 hoodies" with 3 cards is caught while "3 hoodies" passes. All five pass. In the running app every chat reply goes through the guard, as the `replies_checked` count at `http://localhost:5173/api/health` shows.

**Limit:** the guard checks that each figure came from a tool, not which item it belongs to. That gap is what the per-item `stock_note` and prompt rule in improvement 3 cover.
