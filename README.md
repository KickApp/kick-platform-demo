# kick-platform-demo

Demo app for the [Kick](https://kick.co) Platform API: a React frontend and a
small Express BFF backend covering **workspaces**, **entities**, **Plaid
connections**, **transactions**, the **chart of accounts**, **account groups**
and **reports** through the external Platform API.

Opening a workspace gives six tabs: manage its entities, manage an entity's
chart of accounts (create, rename, move between groups, archive, delete),
manage the account groups arranging that chart into a hierarchy, manage the
Plaid connections the partner created (list, connect through Plaid Link,
delete), read the workspace's transactions across every entity and
recategorize them, and read an entity's accounting reports. The backend also
receives Kick's webhooks and logs them — see [Webhooks](#webhooks).

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
browser. The contract and Zod schemas live in `shared/` and are a standalone,
hand-maintained mirror of the Platform API surface this demo uses.

## Setup

Requirements: Node.js >= 20.

```bash
npm install
cp .env.example .env   # then set KICK_PLATFORM_API_TOKEN (skip if the env var is already set)
```

Configuration (env vars, or `.env` at the repo root):

| Variable                      | Default                       | Purpose                                       |
| ----------------------------- | ----------------------------- | --------------------------------------------- |
| `KICK_PLATFORM_API_TOKEN`     | — (required)                  | `kick_org_...` organization access token      |
| `KICK_API_BASE_URL`           | `https://use-dev.kick.co/api` | Kick API base (note the `/api` suffix)        |
| `BACKEND_PORT`                | `4001`                        | Port for the BFF backend                      |
| `KICK_WEBHOOK_SIGNING_SECRET` | — (optional)                  | `whsec_...` secret of your webhook endpoint   |
| `PLAID_CLIENT_ID`             | — (optional)                  | Your Plaid client id, for the Plaid Link flow |
| `PLAID_SECRET`                | — (optional)                  | Your Plaid secret for `PLAID_ENV`             |
| `PLAID_ENV`                   | `sandbox`                     | `sandbox` or `production`                     |
| `PLAID_PRODUCTS`              | `transactions,auth`           | Products enabled on the linked Item           |

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
  -d '{"name": "Acme Inc."}'

# List entities of a workspace
curl -s "http://localhost:4001/api/platform/v1/entities?workspaceId=<uuid>"

# Create an entity. chartOfAccounts is optional and defaults to "standard";
# "custom" seeds only the accounts Kick automations require
curl -s -X POST "http://localhost:4001/api/platform/v1/entities" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "<uuid>", "name": "Acme LLC", "legalType": "smllc", "bookkeepingStartDate": "2026-01-01", "chartOfAccounts": {"type": "custom"}}'

# List the Plaid connections of a workspace (optionally narrowed to entities)
curl -s "http://localhost:4001/api/platform/v1/plaid-connections?workspaceId=<uuid>&entityIds=<uuid>"

# Create a Plaid connection from a processor token you already have, declaring
# the institution and account details your Link flow reported — Kick makes no
# Plaid account call at creation time. accountSubtype, accountName and
# accountNumberMask are optional
# (the UI goes through Plaid Link instead — see "Plaid connections" below)
curl -s -X POST "http://localhost:4001/api/platform/v1/plaid-connections" \
  -H "Content-Type: application/json" \
  -d '{"entityId": "<uuid>", "processorToken": "processor-sandbox-<identifier>", "institutionId": "ins_109508", "accountId": "<plaid-account-id>", "accountType": "depository", "accountSubtype": "checking", "accountName": "Plaid Checking", "accountNumberMask": "0000"}'

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

# Create an account (code is optional; Kick allocates one in the type's range)
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts" \
  -H "Content-Type: application/json" \
  -d '{"name": "Software Subscriptions", "type": "Operating Expenses"}'

# Create up to 100 accounts in one atomic call
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/bulk" \
  -H "Content-Type: application/json" \
  -d '{"accounts": [{"name": "Consulting Revenue", "type": "Income"}, {"name": "Contractors", "type": "COGS"}]}'

# Rename an account and/or move it between groups (type, class and code are
# fixed on creation; "groupId": null removes it from its group)
curl -s -X PATCH "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/<uuid>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Software & SaaS", "groupId": "<uuid>"}'

# Archive and restore an account
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/<uuid>/disable"
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/<uuid>/enable"

# Delete an account (409 once it has journal entries — archive it instead)
curl -s -X DELETE "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/<uuid>"

# Merge the source account into the target and delete the source
# (a blocked merge answers 409 with the list of blockers)
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/chart-of-accounts/merge" \
  -H "Content-Type: application/json" \
  -d '{"sourceAccountId": "<uuid>", "targetAccountId": "<uuid>"}'

# List an entity's account groups, in the order the chart displays them
curl -s "http://localhost:4001/api/platform/v1/entities/<uuid>/account-groups?limit=100"

# Create an account group (parentGroupId is optional and must share the type)
curl -s -X POST "http://localhost:4001/api/platform/v1/entities/<uuid>/account-groups" \
  -H "Content-Type: application/json" \
  -d '{"name": "Marketing", "type": "Operating Expenses"}'

# Rename a group and/or move it under another parent (null re-roots it;
# a group's type is fixed on creation)
curl -s -X PATCH "http://localhost:4001/api/platform/v1/entities/<uuid>/account-groups/<uuid>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Growth", "parentGroupId": null}'

# Delete a group; its accounts and child groups are lifted to its parent
curl -s -X DELETE "http://localhost:4001/api/platform/v1/entities/<uuid>/account-groups/<uuid>"

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
  │      { entityId, publicToken, account,                 │               │
  │        institutionId }                                 │               │
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
bookable account. Kick makes no Plaid account call at creation time, so the
create request declares the account's Plaid id, type, subtype, name and number
mask; the browser passes what Link metadata reported, and when Link reports no
account the backend reads the details off the Item. Kick also requires the
Plaid `institutionId` on create; the browser passes the one Link reported, and
when Link reports none the backend reads it off the Item, failing with a clear
message if Plaid names no institution at all.

These three routes (`/api/demo/v1/plaid-link/...`) are the demo's own; every
other route the BFF exposes mirrors the Platform API exactly.

Deleting a connection also deletes its accounts and their transactions; a
connection whose account carries manual journal entries answers `409`, which
the UI surfaces verbatim.

## Webhooks

Kick reports things that happen outside an API call as webhooks — today only
that a Plaid connection stopped syncing and the business owner has to reconnect
it. This demo receives them at `POST /api/demo/v1/webhooks/kick` and does one
thing with them: prints them. Nothing is stored and no resource is refetched, so
no screen reacts to an incoming event.

Configure the endpoint URL and copy its `whsec_...` signing secret in the Kick
app under **Organization → API → Webhooks → Open portal**, then set
`KICK_WEBHOOK_SIGNING_SECRET` and restart the backend. Kick has to be able to
reach the endpoint, so a local backend needs a public tunnel — e.g.
`ngrok http 4001`, registering
`https://<subdomain>.ngrok.app/api/demo/v1/webhooks/kick`.

Deliveries arrive [Svix-signed](https://docs.svix.com/receiving/verifying-payloads/how):
the body is the bare event payload, and `svix-id`, `svix-timestamp` and
`svix-signature` headers (or their `webhook-` prefixed aliases) sign the raw
request bytes. With the secret set, a delivery whose signature does not verify
is answered `400`; without it deliveries are still logged, marked
`signature=unverified`, which is fine for a local replay and not something to
point a real endpoint at.

A logged delivery looks like this:

```
[webhook] plaid.connection.disconnected id=msg_2hT8kQ timestamp=2026-08-11T07:20:00.000Z signature=verified
{
  "version": 1,
  "connectionId": "6f1c...",
  "workspaceId": "b0a2...",
  "entityId": "48d9...",
  "bankName": "Mercury",
  "errorCode": "disconnected",
  "occurredAt": 1786520400
}
```

The event name never crosses the wire: Kick sets it on the Svix message and
sends the payload alone. The receiver therefore names an event by matching its
shape against the schemas in `shared/src/schemas/webhook-event.schema.ts`. A
payload matching none of them is logged as `unrecognized payload` and still
answered `200` — that is what an event added upstream looks like from here.

With `KICK_WEBHOOK_SIGNING_SECRET` unset you can replay a delivery yourself:

```bash
curl -s -X POST http://localhost:4001/api/demo/v1/webhooks/kick \
  -H 'Content-Type: application/json' \
  -d '{"version":1,"connectionId":"'"$(uuidgen)"'","workspaceId":"'"$(uuidgen)"'","entityId":"'"$(uuidgen)"'","bankName":"Mercury","errorCode":"disconnected","occurredAt":1786520400}'
```

## Managing the chart of accounts

A chart of accounts belongs to one entity, so the tab picks one and lists its
accounts grouped by class. New accounts are created one at a time, or in bulk
by pasting a block where each line reads `Name, Type` with an optional trailing
code. The fields are read from the right, because an account name may itself
contain commas while a Kick account type never does — so
`Meals, Entertainment, Operating Expenses, 6420` parses as the name "Meals,
Entertainment", the type "Operating Expenses" and the code `6420`. Leaving the
code off lets Kick allocate the next one in the type's range. The bulk call is
atomic: if Kick rejects any account in the batch, none are created.

An existing account accepts four writes, and which of them a given account
allows is not visible on the wire, so all four are always offered and Kick's
own message is shown when it declines:

- **Rename** — an account's type, class and code are fixed once it exists, so
  the name is the only field the update changes besides the group. Renaming an
  account Kick seeded answers `400`.
- **Move between groups** — the same update call takes a `groupId` pointing at
  an account group of the account's type, or `null` to leave its group. The
  Group column offers the eligible groups directly.
- **Archive** (`disable`) and **Restore** (`enable`) retire an account without
  losing history. Archived accounts stay in the listing flagged `isDisabled`
  and drop out of the transactions tab's picker. Role-holder accounts and
  accounts tied to a financial account cannot be archived.
- **Delete** is permanent and answers `409` once the account carries journal
  entries; archiving is the way to retire those.

An entity created with a custom chart of accounts starts with only the accounts
Kick automations require — clearing accounts, uncategorized income and
expenses. Kick seeds them lazily, so they appear the first time this tab reads
the chart.

## Account groups

Account groups arrange an entity's chart of accounts into a hierarchy for
reporting: a group and every account inside it share one account type, and
groups nest under parents of that same type. The tab lists an entity's groups
in one section per type with children indented, shows how many accounts each
group holds, and offers the full write surface — create (with an optional
parent), rename, move under another parent (the picker never offers the
group's own subtree, which Kick would reject as a cycle), and delete, which
lifts the group's accounts and child groups to its parent rather than removing
them. Accounts are placed into groups from the chart of accounts tab, not
here: membership is a field on the account (`groupId`), written through the
account update call.

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
backend/   Express BFF: authenticates to Kick, passes requests/errors through,
           logs incoming webhooks
frontend/  React app: workspaces list/create, then per-workspace entities,
           chart of accounts, account groups, Plaid connections, transactions
           and reports tabs
```

See [AGENTS.md](AGENTS.md) for a guide aimed at coding agents extending this
project (e.g. adding the classes or journal-entries resources).
