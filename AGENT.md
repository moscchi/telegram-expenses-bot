# AGENT.md — Telegram Bot: Shared Couple Finances (JS/Node)

## 0) Purpose
Build a Telegram bot (Node.js + Typescript) to manage shared finances between two people (e.g., you and your girlfriend). Core capability: log expenses with structure (who paid, what, how much, category, date) and generate monthly summaries, balances, and category trends (e.g., “vinos” over the last months).

This project replaces the current WhatsApp + “Meta IA” workflow with:
- fast capture
- reliable persistence
- deterministic calculations
- trend reporting

## 1) Non-goals (MVP)
- No multi-currency support.
- No complex splits (percentages, per-user shares) beyond 50/50.
- No bank integrations.
- No UI dashboard (Telegram-only).
- No AI-required pipeline (optional later).

## 2) Tech constraints
- Language: Typescript (Node.js).
- Telegram framework: **Telegraf**.
- Storage (MVP): **LowDB** (JSON file).
- Runtime: long-polling (no webhook) to keep deployment simple.

## 3) Product scope
### 3.1 Core features (MVP)
1) **Register expense**
   - Minimal friction command: `/g <amount> <description>`
   - PaidBy defaults to message sender.
   - Category auto-suggested from keywords; user can override.
   - Date defaults to “now” (server time).

2) **Monthly totals**
   - `/month` shows total spent this month (workspace scope).

3) **Balance (50/50)**
   - `/balance` shows who owes whom for current month.

4) **Summary by category**
   - `/summary` shows totals per category for current month + % of total.

5) **Basic management**
   - `/last` shows last N expenses (default 5).
   - `/del <id>` deletes an expense.
   - `/help` shows commands.

### 3.2 “Soon” features (post-MVP)
- `/trend <category> [months]` show monthly totals for a category across last N months.
- `/summary YYYY-MM` select specific month.
- `/export YYYY-MM` export CSV.
- Edit expense fields: `/edit <id> amount|cat|desc|date|paidBy`.
- Custom categories per workspace.

## 4) Domain model
### 4.1 Entities
**Workspace**
- `id` (string): derived from chat id (group or DM).
- `title` (string): chat title (optional).
- `createdAt`

**Member**
- `id` (string): Telegram user id
- `username` (string | null)
- `firstName` (string | null)

**Expense**
- `id` (string): unique (uuid)
- `workspaceId` (string)
- `amount` (integer): store as cents OR as integer pesos (define below)
- `currency` (string): default "ARS" (fixed in MVP)
- `description` (string)
- `category` (string)
- `paidBy` (memberId)
- `date` (ISO string)
- `createdAt` (ISO string)
- `createdBy` (memberId)

### 4.2 Amount storage rule (important)
MVP decision:
- Store as **integer minor units** (cents) to avoid float problems.
- If user writes `/g 12500 ...` interpret as **12500 ARS** (no decimals) and store `12500 * 100`.
- If user writes `/g 12500.50 ...` store exact cents.

Provide helpers:
- `parseMoney(input) -> cents`
- `formatMoney(cents) -> "12.500,50"` (locale es-AR formatting)

## 5) Business rules
### 5.1 Workspace scoping
All calculations are per `workspaceId` (per chat). If the bot is in a group, that group is a workspace. If used in DM, the DM is a workspace.

### 5.2 Split rule (MVP)
All expenses are split **50/50** between the two members present in the workspace.
- If more than 2 members exist, still compute based on “active members”:
  - MVP assumption: only two members will use it.
  - If a third appears, show a warning message in `/balance` (“workspace has more than 2 members; MVP balance assumes first 2 active members”). Keep running.

### 5.3 Balance formula (50/50, 2 members)
For a given month:
- Let `paidA` = sum(expenses paid by A)
- Let `paidB` = sum(expenses paid by B)
- Total `T = paidA + paidB`
- Each share = `T / 2`
- If `paidA > share`, then B owes A: `paidA - share`
- If `paidB > share`, then A owes B: `paidB - share`

### 5.4 Category auto-suggestion
Maintain a keyword dictionary:
- `vinos`: vino, malbec, cabernet, chardonnay, syrah, bianchi, zuccardi, luigi bosca, salentein, catena
- `super`: coto, disco, carrefour, jumbo, dia, supermercado
- `delivery`: rappi, pedidosya, uber eats, delivery
- `salidas`: bar, resto, restaurante, cine
- `hogar`: ferreteria, ikea, easy, sodimac
- default: `otros`

If multiple match, choose the most specific (first match by priority list).
Allow override:
- `/g 12000 [vinos] malbec` OR `/g 12000 cat:vinos malbec`
Choose ONE syntax for MVP. Prefer bracket syntax: `[vinos]`.

## 6) UX requirements (Telegram)
### 6.1 Commands
- `/start`: onboarding + brief help
- `/help`: command list
- `/g <amount> <desc>`: register expense paid by sender
- `/g <amount> [cat] <desc>`: register with category override
- `/month`: total of current month
- `/balance`: who owes whom (current month)
- `/summary`: totals by category (current month)
- `/last [n]`: show last n expenses (default 5)
- `/del <id>`: delete by id

### 6.2 Output formatting
- Use MarkdownV2 or HTML consistently. Prefer **HTML** to reduce escaping complexity.
- Always show monetary values formatted.
- Expense line format (in `/last`):
  - `#ID 12.500,00 ARS — vinos — “malbec” — paid by @user — 2025-12-20`

### 6.3 Minimal friction
- `/g` should accept:
  - integers (`12500`)
  - decimals (`12500.50`)
  - thousand separators (`12.500` or `12,500`) — normalize

## 7) Project structure
Use a clean-ish modular structure (not full hexagonal yet, but layered and testable).

/src
/bot
bot.js # telegraf bootstrap
commands.js # register command handlers
/domain
expense.js # domain helpers/types
balance.js # balance calculation
categories.js # category matching rules
time.js # month boundaries utilities
/infra
db.js # lowdb init + adapters
repositories.js # ExpenseRepository, WorkspaceRepository
/app
expenseService.js # use cases: add/list/delete/summary/balance
/utils
money.js # parse/format money
text.js # parsing helpers
index.js # entry point
/data
db.json # lowdb file (gitignored)
.env


## 8) Implementation plan (Cursor execution order)
### Step 1 — Bootstrap
- Initialize Node project.
- Add dependencies: `telegraf`, `lowdb`, `dotenv`, `uuid`.
- Setup `.env` with `TELEGRAM_BOT_TOKEN=...`.
- Add `npm run dev` using `node index.js`.

### Step 2 — LowDB schema
Define JSON structure:
```json
{
  "workspaces": [],
  "members": [],
  "expenses": []
}

Step 3 — /start and /help

Show short instructions and examples.

Step 4 — /g parsing and persistence

Parse amount

Detect or parse category override

Persist Expense

Step 5 — /month, /summary, /balance

Implement month boundaries: start-of-month, end-of-month (local time).

Query expenses for month.

Compute totals, category sums, and balance.

Step 6 — /last and /del

List last N expenses for workspace.

Delete by id (ensure workspaceId match).

Step 7 — Hardening

Input validation errors as user-friendly messages.

Basic logging (console).

Protect from crashing on malformed messages.

9) Acceptance criteria (MVP)

In a chat, user can run /g 12000 vino malbec and expense is stored.

/month returns correct total for current calendar month.

/summary returns categories with totals and percentages.

/balance returns correct settlement for the month for two users.

/last 5 lists last 5 expenses with IDs.

/del <id> removes an expense and it no longer affects totals/balance.

10) Testing strategy (lightweight)

MVP testing:

Pure functions unit tests (optional if time): parseMoney, inferCategory, computeBalance, monthRange.
If tests are added:

Use vitest or jest with a /tests folder.

11) Security and privacy

Token only via .env, never hardcoded.

Do not log raw messages.

Local JSON file contains financial data; add .gitignore for /data/db.json.

12) Future design notes (v2+)

Convert to hexagonal architecture (ports/adapters).

Replace LowDB with Postgres.

Add multi-workspace management and roles.

Add export (CSV/PDF).

Add budgets and alerts (category thresholds).

Add AI insights layer (optional) for “spend anomalies” and summaries.

13) Cursor instructions (how to iterate)

When implementing, follow these rules:

Keep functions pure when possible.

Keep parsing and domain logic out of Telegram handlers.

Add small, incremental commits: one command per iteration.

After each new command, add a short manual test checklist in a comment or README snippet.

14) Example interactions

/g 12500 vino luigi bosca

/g 8300 [super] coto compras

/month

/summary

/balance

/last

/del 7f3a2c

End.