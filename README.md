# kick-platform-demo

Demo app for the [Kick](https://kick.co) Platform API: a React frontend and a
small Express BFF backend covering **workspaces**, **entities**, **Plaid
connections**, **transactions**, the **chart of accounts** and **reports**
through the external Platform API.

Opening a workspace gives four tabs: manage its entities, manage the Plaid
connections the partner created (list, connect through Plaid Link, delete),
read the workspace's transactions across every entity and recategorize them,
and read an entity's accounting reports.

## How it works

```
Browser (React + Vite, :5173)
   │  /api/platform/v1/...          (Vite dev proxy)
   ▼
BFF backend (Express + ts-rest, :4001)
   │  Authorization: Bearer $KICK_PLATFORM_API_TOKEN
   ▼
Kick API  https://use-dev.kick.co/api/platform/v1/...
```

The backend is a thin pass-through: it exposes the same ts-rest contract it
consumes and only adds the organization access token, which never reaches the
browser. The contract and Zod schemas live in `shared/` and are a vendored,
standalone mirror of the contracts in the main kick repo
(`common/contracts/platform/*.platform.contract.ts`).

## Setup

Requirements: Node.js >= 20.

```bash
npm install
cp .env.example .env   # then set KICK_PLATFORM_API_TOKEN (skip if the env var is already set)
```

Configuration (env vars, or `.env` at the repo root):

| Variable                  | Default                       | Purpose                                       |
| ------------------------- | ----------------------------- | --------------------------------------------- |
| `KICK_PLATFORM_API_TOKEN` | — (required)                  | `kick_org_...` organization access token      |
| `KICK_API_BASE_URL`       | `https://use-dev.kick.co/api` | Kick API base (note the `/api` suffix)        |
| `BACKEND_PORT`            | `4001`                        | Port for the BFF backend                      |
| `PLAID_CLIENT_ID`         | — (optional)                  | Your Plaid client id, for the Plaid Link flow |
| `PLAID_SECRET`            | — (optional)                  | Your Plaid secret for `PLAID_ENV`             |
| `PLAID_ENV`               | `sandbox`                     | `sandbox` or `production`                     |
| `PLAID_PRODUCTS`          | `transactions,auth`           | Products enabled on the linked Item           |

Without the `PLAID_*` variables everything still works; only "New connection"
on the Plaid connections tab is disabled, with a message saying so.

## Run

```bash
npm run dev
```

This starts the backend on http://localhost:4001 and the frontend on
http://localhost:5173 (the dev server proxies `/api` to the backend). Open
http://localhost:5173.

Other commands:

```bash
npm run typecheck     # typecheck all workspaces
npm run build         # production build of the frontend
npm run format        # prettier
```

`npm run typecheck` also runs in CI on every pull request and on pushes to
`main` (see `.github/workflows/typecheck.yml`).

## Curl examples (against the BFF)

```bash
# List workspaces
curl -s "http://localhost:4001/api/platform/v1/workspaces?limit=10"

# Create a workspace
curl -s -X POST "http://localhost:4001/api/platform/v1/workspaces" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Inc.", "bookkeepingStartDate": "2026-01-01"}'

# List entities of a workspace
curl -s "http://localhost:4001/api/platform/v1/entities?workspaceId=<uuid>"

# Create an entity
curl -s -X POST "http://localhost:4001/api/platform/v1/entities" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "<uuid>", "name": "Acme LLC", "legalType": "smllc", "bookkeepingStartDate": "2026-01-01"}'

# List the Plaid connections of a workspace (optionally narrowed to entities)
curl -s "http://localhost:4001/api/platform/v1/plaid-connections?workspaceId=<uuid>&entityIds=<uuid>"

# Create a Plaid connection from a processor token you already have
# (the UI goes through Plaid Link instead — see "Plaid connections" below)
curl -s -X POST "http://localhost:4001/api/platform/v1/plaid-connections" \
  -H "Content-Type: application/json" \
  -d '{"entityId": "<uuid>", "processorToken": "processor-sandbox-<identifier>"}'

# Delete a Plaid connection (409 when its account carries manual journal entries)
curl -s -X DELETE "http://localhost:4001/api/platform/v1/plaid-connections/<uuid>"

# List transactions of a workspace within an inclusive date range
curl -s "http://localhost:4001/api/platform/v1/workspaces/<uuid>/transactions?startDate=2026-01-01&endDate=2026-01-31"

# Categorize a transaction (null clears it; 409 inside a locked bookkeeping period)
curl -s -X PATCH "http://localhost:4001/api/platform/v1/workspaces/<uuid>/transactions/<uuid>" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "<uuid>"}'

# List an entity's chart of accounts (archived accounts included, flagged isDisabled)
curl -s "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts?limit=100"

# Reports for an entity: profit-and-loss, balance-sheet, cash-flow, trial-balance
curl -s "http://localhost:4001/api/platform/v1/entities/<uuid>/reports/profit-and-loss?startDate=2026-01-01&endDate=2026-12-31&ledgerBasis=cash&groupBy=month"

# The general ledger lists individual postings, so it takes no groupBy
curl -s "http://localhost:4001/api/platform/v1/entities/<uuid>/reports/general-ledger?startDate=2026-01-01&endDate=2026-12-31&ledgerBasis=cash"
```

The same paths work directly against the Kick API — replace the host with
`https://use-dev.kick.co/api` and add
`-H "Authorization: Bearer $KICK_PLATFORM_API_TOKEN"`.

## Plaid connections

The Platform API has no link-token or public-token exchange: minting the
`processor_token` is the partner's job. This demo therefore runs the whole
Plaid Link flow itself, and the browser never sees anything but a link token:

```
Browser                     Demo BFF                    Plaid            Kick
  │  POST /demo/v1/plaid-link/link-token                   │               │
  │ ─────────────────────────▶ /link/token/create ────────▶│               │
  │ ◀───────── link_token ─────────────────────────────────│               │
  │  (Plaid Link opens, user picks an account)             │               │
  │  POST /demo/v1/plaid-link/connections                  │               │
  │      { entityId, publicToken, accountId }              │               │
  │ ─────────────────────────▶ /item/public_token/exchange▶│               │
  │                            /processor/token/create ───▶│               │
  │                              (processor: "kick")       │               │
  │                            POST /platform/v1/plaid-connections ───────▶│
  │ ◀───────── { connection, account } ────────────────────────────────────│
```

`kick` is a registered Plaid processor, so `/processor/token/create` mints a
token Kick can read with its own processor-partner credentials. The Plaid
access token stays inside the demo backend: Kick only ever receives the
processor token, and the browser only ever receives a link token.

Link is filtered to USD credit, depository and loan accounts because Kick
books nothing else, and a connection covers exactly one account. If your Plaid
dashboard does not have single-account select enabled, the backend reads the
Item and fails with a clear message when the link resolves to more than one
bookable account.

These three routes (`/api/demo/v1/plaid-link/...`) are the demo's own; every
other route the BFF exposes mirrors the Platform API exactly.

Deleting a connection also deletes its accounts and their transactions; a
connection whose account carries manual journal entries answers `409`, which
the UI surfaces verbatim.

## Transactions and the chart of accounts

A transaction's categorization is a field on the transaction itself:
`accountId` points at an account of its entity's chart of accounts. The
Account column on the transactions tab shows it and turns into a picker on
click; choosing an account (or "Uncategorized") sends
`PATCH .../transactions/:transactionId` with only `accountId`, so nothing else
on the transaction moves. Inside a locked bookkeeping period the API answers
`409` and the message is shown next to the cell.

A chart of accounts belongs to one entity while the transactions listing spans
the whole workspace, so the tab loads the chart of each entity appearing on the
current page. Archived accounts are hidden from the picker unless one is the
current assignment.

There is also an accrual-basis `accrualAccountId`. It is part of the vendored
schemas because `shared/` mirrors the upstream contract, but this demo keeps
cash-basis books only and no screen reads or writes it.

## Reports

The Reports tab covers all five Platform API reports — profit and loss, balance
sheet, cash flow, trial balance and general ledger. Reports are scoped to a
single entity rather than a workspace, so the tab picks one. The date range is
inclusive, and `groupBy` splits it into weekly/monthly/quarterly/yearly columns
without changing the response shape; the general ledger lists individual
postings instead of period aggregates and so offers no grouping. Everything is
requested on the cash basis.

## Project layout

```
shared/    Vendored Platform API contract + Zod schemas (ts-rest), used by both sides
backend/   Express BFF: authenticates to Kick, passes requests/errors through
frontend/  React app: workspaces list/create, then per-workspace entities,
           Plaid connections, transactions and reports tabs
```

See [AGENTS.md](AGENTS.md) for a guide aimed at coding agents extending this
project (e.g. adding the classes or journal-entries resources).
