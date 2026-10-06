# Campus Customs: Storefront + AI Shopping Assistant

A customer website for Campus Customs, a Yale spirit-wear shop, with a chat assistant that answers honestly about price and stock from the shop's database.

- **Frontend:** React + Vite + TypeScript (Home, Products, single product, About Us, Log In, Create Account, shopping bag).
- **Backend:** Python FastAPI, with a **PydanticAI** agent (`gpt-5.6-luna` via Portkey) as the chat brain.
- **Data:** SQLite `campus_customs.db` (product catalogue, inventory by size, users with hashed passwords, saved chats).

Shoppers can browse and filter products, create an account and log in, and chat with the "Bulldog Concierge". When they ask about a type of item ("what hoodies do you have?"), the matching products appear on the page as cards.

> This is a student project for MGT409 inspired by Yale spirit. It is not affiliated with or endorsed by Yale University.

---

## Quick start

**Requirements:** Python 3.12+ (built with 3.14), Node.js 20+ (built with 24), and a Portkey API key.

The database and product photos are **not in this repo**. Get the local data pack and place it inside `hw4/` so you have:

```
hw4/
  data/
    campus_customs.db
    products/        # product images referenced by the catalogue
```

**First time**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set PORTKEY_API_KEY and SESSION_SECRET
cd frontend && npm install && cd ..
```

**Run** (two terminals, from the `hw4` folder, after placing the data pack):

```bash
# Terminal 1: backend
source .venv/bin/activate
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**. On the very first start the backend prepares cleaned product photos (about 2 minutes); later starts are instant.

**Test login:** `test@campuscustoms.yale.edu` / `password`

**Automated checks** (no API calls):

```bash
cd backend && python tests/test_honesty_guard.py
```

---

## Where to find each part of the homework

| Problem | What it covers | Where to look |
|---|---|---|
| 1. Vibe coder prompts | The prompts used to build the project | [`AI_prompts.md`](AI_prompts.md), plus screenshots of each prompt in [`output/command_screenshots/`](output/command_screenshots/) |
| 2. Analyze the database | Every table and field, and why it matters | [`output/harness.md`](output/harness.md) §11 |
| 3. Build the website | React + Vite site, products, single-item page, chat panel, FastAPI | `frontend/`, `backend/main.py` |
| 4. Create account and log in | Sign-up and login with salted PBKDF2 password hashes | `backend/auth.py`, harness §10 |
| 5. PydanticAI agent backend | Chat route, agent wiring, prompt, models, tools | `backend/agent.py`, `prompts/prompt.md`, `models.py`, `tools.py` |
| 6. Product info and stock tools | Description, price and per-size stock tools | `backend/tools.py`, harness §5 |
| 7. Chat search that updates the page | Structured product matches rendered as cards | harness §9 |
| 8. Customer memory | Saved chat history, customer in agent deps, page context | harness §8 |
| 9. Usability improvements | Filters and price range, chat shortcuts, sold-out rescue, honesty guard | [`output/usability.md`](output/usability.md) |
| 10. Style the website | Yale editorial design, bulldog mascot, bag, consistent product photos | [`output/design.md`](output/design.md) |
| 11. Site testing | Screenshots and captions from the live site | [`output/app_check.html`](output/app_check.html) (open in a browser) |
| 12. Audit trail, safety, harness | Append-only agent log, safety rules, full system description | [`output/audit_trail.json`](output/audit_trail.json), [`output/harness.md`](output/harness.md) |

**[`output/harness.md`](output/harness.md) is the full technical reference:** architecture, specs and limits, every model field, tools, safety rules, audit trail format, API endpoints and project layout. `output/command_screenshots/` holds screenshots of the prompt given for each problem (`p01-…` to `p12-…`). `output/screenshots/` holds screenshots of the site taken while building Problems 4–10, so the earlier ones show the site before later redesigns.

---

## Project layout

```
hw4/
  AI_prompts.md        prompts used to build the project
  requirements.txt     Python packages for the backend
  .env.example         settings to copy into .env (placeholders only)
  .gitignore
  README.md
  frontend/            Vite + React + TypeScript app
  backend/
    main.py            FastAPI app: run with  uvicorn main:app --reload --port 8000
    agent.py           \
    models.py           |  the agent: wiring, Pydantic types, database tools,
    tools.py            |  and the system prompt
    prompts/prompt.md  /
    auth.py, audit.py, db.py, images.py, tests/   accounts, audit trail, DB, photos, checks
  output/
    harness.md, design.md, usability.md
    app_check.html, app_check_images/   live-site checks (open the HTML in a browser)
    audit_trail.json                     append-only agent-loop log
    command_screenshots/, screenshots/   prompt and build screenshots

  data/                (local only, not in git: campus_customs.db, products/)
```

The agent is the four files under `backend/`: `prompts/prompt.md`, `agent.py`, `tools.py` and `models.py`.

Not committed: `.env` (API key and session secret), `data/` (database, product photos and cleaned copies), `.venv/`, `node_modules/`.
