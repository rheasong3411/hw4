# AI Prompts — Homework 4: Campus Customs

A log of the prompts I typed to my AI coding assistant to solve this homework, updated as each problem is worked on. The running site, database writes and screenshots are the evidence of the results.

## Context (before problem work began)

These messages set up the workspace and scenario; they are not themselves problems.

> Can you open the Homework 4 folder in MGT409?

> OK, so we are working in this folder, so make sure everything's put there.

> OK, so the scenario is that Campus Customs, which is a merch business brand, needs a real customer website with a helpful chatbot (nothing to do at this point, but just so you know). What we are building for this homework is a React + Vite TypeScript frontend and a Python FastAPI backend whose brain is a PydanticAI agent. On this website, shoppers should be able to browse products, create an account with the brand, chat about the merch with the chatbot, see matching items popping up at the bottom of the page, and get honest answers about price and stock from a local database we have.
>
> You are given campus_customs.db in the data folder, with tables for the product catalogue, inventory by size, and users with hashed passwords. Product image file paths are in the catalogue table. Go to https://yalebulldogblue.com/ and research it to learn the style of the Campus Customs page and info for your agent prompt.
>
> Then we are going to use my API key and work one problem at a time. In the end we are pushing the project to a public GitHub repo and submitting the repo URL, so do not commit the database or product images. Everything to start with (data) is in the data folder. But hold off on creating anything yet — this is just for context.

---

## Problem 1 — Vibe Coder Prompts

**Prompt:**

> OK, so problem 1 — vibe coder prompts.
>
> First, we create AI_prompts.md and keep it updated as we work. This file logs what I typed to you to solve the homework, and it should be updated automatically every time we do a problem.
>
> So I will describe every problem to you, and please put the following parts for each problem:
> 1) the problem number and title
> 2) at least one prompt I typed
> 3) one follow-up prompt if we ever need one (i.e., if the first prompt didn't work) and one sentence on what was lacking after the first
>
> Our running site, database writes, and screenshots are the evidence, so we don't need an extra proof essay beyond these prompts.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 2 — Analyze the Database

**Prompt:**

> OK, so problem 2, titled "Analyze the Database."
>
> So go into data/campus_customs.db and understand each field of each table, such as catalogue, inventory, and users. Then create a file output/harness.md and write down each table and its fields according to the database (campus_customs.db), with one short sentence on why each field matters for the shop or the chatbot. We will keep growing the harness file along the way for later problems.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 3 — Build the Campus Customs Website

**Prompt:**

> OK, problem 3 — build the Campus Customs website.
>
> Scaffold a React + Vite + TypeScript frontend for Campus Customs. Put a nav bar at the top that links to the main pages, which should include the following:
> 1. Home page
> 2. Products page
> 3. About Us page
> 4. Log In page
> 5. Create Account page
>
> Pull Campus Customs–style wording from https://yalebulldogblue.com/ for Home and About Us, but write these pages in your own words and make sure you are not copying the original site text.
>
> Then on the Products page, show product images from the catalogue (so use the image paths in the database) with basic product info (including name, price, and a short description).
>
> Make each product open a single item page (so a large image on one side and the full product text on the other — description, price, sizes; show sizes and stock when we have them, and if there's no stock, show "out of stock" and the sizes should be unavailable). Clicking a card on Products should take the shopper there.
>
> Then add a chat interface in the bottom right of the site, which could be a floating chat panel. It does not need to talk to an agent yet — just a stub that will call the backend later is enough for this problem.
>
> Then we will need a small API to read the database, so it's fine to start a simple FastAPI app in backend/main.py just to serve products and images, then grow it into the agent backend in Problem 5 (which we will be working on soon).

**Follow-up prompt:**

> OK, for some reason there's a page for hoodies and crewnecks — do we want that as a standalone page?

> The nav should only have the following as standalone pages: Home, Products, About Us, Log In, and Create Account. Also record this change to the prompts in Problem 3, since we updated this.

**What was lacking after the first prompt:** after the later redesign, the nav bar also showed Hoodies and Crewnecks shortcuts that looked like extra standalone pages, so the nav no longer matched the five main pages this problem asked for.

**Second follow-up prompt:**

> Also, for the inventory availability: don't show the total availability for all sizes, but show the inventory number for a specific size after the shopper selects that size.

**What was lacking:** the single-item page showed every size's stock count up front plus a "Total available" figure for all sizes, instead of showing the count only for the size the shopper selects.

---

## Problem 4 — Create Account and Log In

**Prompt:**

> OK, problem 4 — create account and log in.
>
> So we need to build a normal create-account / log-in flow in the webpage.
> For create account, we need space for customers to fill in first name, last name, email, and password (also, confirm password is a nice touch).
> For log in, we need email and password.
> New accounts go into the users table, and make sure to store passwords securely so hackers (human or AI) cannot access them — and log in should be able to match the ones from the database.
>
> The seed database already has a test user you can use while building:
> - email: test@campuscustoms.yale.edu
> - password: password
>
> Confirm you can log in as that user and that a brand-new account you create can also work. Then update output/harness.md with how auth works — so what you store for a user and how passwords are protected.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 5 — PydanticAI Agent Backend

**Prompt:**

> Problem 5 — PydanticAI agent backend.
>
> So we build the shop chatbot as a PydanticAI agent behind FastAPI, plugged into the frontend chat widget. Then put the API app in backend/main.py, which is the file you run with uvicorn. Keep the agent as these four files next to it (same idea as Homework 3, if you remember), including:
> 1) backend/prompts/prompt.md — system prompt, which we will be growing in this same file later
> 2) backend/agent.py — agent entry/wiring
> 3) backend/tools.py — tools the agent can call
> 4) backend/models.py — Pydantic / PydanticAI structured types
>
> In main.py, expose a chat route so a message from the website returns a reply from the agent, and whatever else you need for products/auth — your call. We will need the AI model's API key for the agent.
>
> Put the Campus Customs voice and safety basics into prompts/prompt.md, which we will expand with tools and safety later. Then start or update types in models.py for chat replies / product cards as needed.
>
> In output/harness.md, note how the frontend talks to FastAPI and how the agent is loaded (prompt file + model).
>
> Make sure the backend runs from the backend/ folder like this: uvicorn main:app --reload --port 8000

**Follow-up:** None needed. The first prompt worked.

---

## Problem 6 — Tools: Product Info and Stock

**Prompt:**

> Problem 6 — tools: product info and stock.
>
> Give the agent tools that look up real info from campus_customs.db for the following:
> 1) product descriptions
> 2) price
> 3) how many are in stock (by size when the customer asks/selects)
>
> The agent must use the database and should not invent prices or quantities. If a size is out of stock, say so clearly.
>
> Then expand prompts/prompt.md so that the agent knows to call these tools for price and stock questions. Add or update return types in models.py.
>
> In output/harness.md, list each tool and explain which model fields you chose for lookup results and why.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 7 — Chat Search That Updates the Page

**Prompt:**

> OK, problem 7 — chat search that updates the page.
>
> Add a neat feature to the site, so when a customer asks about a type of item — for example, a question like "what hoodies do you have" — the agent should search the catalogue and the website should dynamically show these matching items as product cards (including image, name, price, short info, etc.).
>
> This is an API contract, so the agent returns structured product matches and then the frontend renders them on the website.
>
> Then, after the dynamic product cards are loaded by your new feature, make sure the same single-item page behavior you built in Problem 3 still works: each product card, including the ones the chat just put on the page, should still open that detail view (large image and full info) when clicked. Then update prompts/prompt.md and output/harness.md so it's clear how search results reach the page.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 8 — Customer Memory

**Prompt:**

> OK, sounds good — back to homework. Problem 8: customer memory.
>
> So when a shopper logs in, save their chat history in the database in an appropriate table and reload it when they return. The agent should know who is chatting (including name, email, etc.) and put that in agent deps (or an equivalent clear pattern) and/or tools the agent can call.
>
> Also pass enough page context that if someone is on a product page and asks "do you have this in pink?", the agent should know which item they mean (you can put code into the agent context).
>
> Guests should still be able to chat, but history only needs to persist for logged-in users.
>
> Document in output/harness.md, including how user chat history is stored, what customer fields the agent sees, and how page context is passed.

**Follow-up:** None needed. The first prompt worked.

---

## Problem 9 — Usability Improvements

**Prompt:**

> OK, problem 9: usability improvements.
>
> Now that the core shop works, improve it. Choose and implement:
> - 2 frontend usability improvements
> - 2 agent/backend usability improvements
>
> Frontend improvements are things that make the site look better and make it easier to use. Agent/backend improvements are things that make the agent output better, more accurate, and safer, so these could be new agent tools or things that make the agent run faster or cheaper.
>
> Then write output/usability.md before or as you build. For each improvement, say:
> - what you added
> - why it helps a Campus Customs shopper or the business
>
> Then make sure all improvements actually show up in the running app. Try to make it comprehensive and imitate websites that are sophisticated and mature — make sure every function works and has a clean fit. The grader of the homework will read the write-up and look for the features.

**Follow-up prompt:**

> Also, when filtering products by price, instead of having max prices (e.g. "Under $xx"), have a different dropdown for customers to select ranges themselves and apply them accordingly.

**What was lacking after the first prompt:** the price filter only offered fixed "Under $X" maximums, so shoppers could not choose their own price range (a minimum and a maximum) and apply it.

---

## Problem 10 — Style the Website

**Prompt:**

> Problem 10 — style the website.
>
> Now it's time to style the web: add creative design so the site feels like a real Campus Customs storefront — fonts, color, hierarchy, motion, product presentation, chat feel. Refer to Yale style (Yale blue, Yale font, and also use the bulldog for decor). The more creative the better.
>
> Some ideas to refer to:
>
> The creative concept is "Yale heritage meets a modern fashion editorial." Make it feel sophisticated, collegiate, and playful, with a strong visual identity throughout.
>
> STYLE
> Use deep Yale blue (#00356B), warm ivory, white, and small pale-blue accents. Pair oversized serif headlines with clean sans-serif text. Include generous whitespace, bold typography, asymmetrical compositions, beautiful product photography, and subtle embroidery-inspired details.
> Create a charming illustrated bulldog mascot as a recurring brand character. Use it selectively: peeking around a headline, wearing Yale merchandise, or greeting users on the account pages. Keep its illustration style consistent.
>
> PAGE DESIGN
> • Home: Create a striking magazine-style hero with oversized YALE lettering, a sweatshirt image, a small bulldog, and the headline "A little Yale. Everywhere." Follow with curated merchandise, a "Bulldog-approved" feature, and a campus-inspired photo collage. Give the page a memorable composition and a clear "Shop the collection" button.
> • Products: Create a polished, easy-to-browse shop with category filters, sorting, prices, and quick views. Use consistent product photography with generous spacing. On hover, show an alternate image or a close-up of the embroidery. Make size selection and adding products to the bag straightforward.
> • About Us: Use an editorial storytelling layout with large typography, campus imagery, and playful annotations. Tell the story of the concept store and its connection to Yale spirit without claiming official affiliation or inventing historical facts.
> • Log in: Use a striking split-screen layout: a simple login form on one side and a full-height Yale-blue illustration of a bulldog in a varsity sweatshirt on the other. Include "Welcome back to the pack."
> • Create account: Match the login page's design, with a different bulldog pose and the headline "Join the pack." Keep the form short, clear, and welcoming.
>
> CREATIVE DETAILS
> Include a few carefully chosen surprises: stitched lines, small pennant-shaped labels, a bulldog that reacts when something is added to the bag, and subtle scrapbook-style captions. Balance playful details with a refined overall layout.
> Use smooth, restrained animation, clear navigation, accessible contrast, and an equally polished mobile layout. Keep shopping and account actions easy to find.
> Build all five pages with one cohesive design system. Prioritize strong art direction, beautiful imagery, and thoughtful spacing over decorative clutter. The result should feel like a finished boutique brand with a distinctive Yale personality.
>
> Write output/design.md: what you changed and why it should help customers stick around and buy. Keep it concrete and short.

**Follow-up prompt:**

> Also for the pictures: right now some of the preview pictures are not showing the whole picture, since the preview format is horizontal but most of the pictures are in vertical ratios. Not sure if I'm explaining this to you clearly, but can you fix the preview product pictures? Also, the backgrounds of the pictures are not consistent — some of them are black backgrounds and some are white. Can you make it consistent — maybe transparent?

**What was lacking after the first prompt:** product previews were cropped to fill their frames, cutting off parts of garments, and the supplied photos mixed black and white backgrounds, so the product presentation was neither complete nor consistent.

---

## Problem 11 — Site Testing

**Prompt:**

> OK, so problem 11: site testing.
>
> Test the live site and document it in output/app_check.html, which is a page I can double-click to open. Include clear screenshots and short captions for:
> 1. the chat checking the inventory level of an item (honest stock/price from the DB and no data invention)
> 2. the dynamic search-result cards appearing after a category question (e.g. hoodies, caps, etc.)
> 3. one or more of the usability features you added in Problem 9
>
> Make the HTML easy to grade: a heading for each check, a screenshot, and one or two sentences on what the screenshot proves. Put the screenshot image files in output/app_check_images/ and link them from app_check.html with relative paths (e.g. app_check_images/inventory.png).

**Follow-up prompt:**

> So can you help me do that? *(asked after the assistant explained that several app_check.html screenshots were out of date)*

**What was lacking after the first prompt:** the screenshots were taken before later changes to the nav, size stock display, price filter and product photos, so several no longer matched the live site; they were retaken and re-checked against the database (which also exposed and fixed leftover black gaps under the arms in some product photos).

---

## Problem 12 — Audit Trail, Safety, Finish Harness

**Prompt:**

> OK, so problem 12: audit trail, safety, finish harness.
>
> So we are keeping an append-only output/audit_trail.json of agent-loop activity, including time, tool name, short args/result, and stop reason. Do not wipe it between runs. Think of some safety rules to give the agent and put them in prompts/prompt.md.
>
> Then finish output/harness.md so it's clear how the system works:
> - model fields in models.py and why you chose them
> - tools and abilities
> - safety rules
> - specs (loop limits, result caps, models, how to run front + back)

**Follow-up:** None needed. The first prompt worked.
