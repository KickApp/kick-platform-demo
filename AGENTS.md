# Guide for coding agents

This repo is a demo client of the Kick Platform API. Read this before making
changes — it captures the non-obvious decisions and gotchas.

## Commands

All commands run from the repo root; a single `npm install` covers all
workspaces.

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm install`       | Install all workspaces (npm workspaces monorepo)          |
| `npm run dev`       | Backend (tsx watch, :4001) + frontend (Vite, :5173)       |
| `npm run typecheck` | `tsc --noEmit` in every workspace — the main quality gate |
| `npm run build`     | Production build of the frontend (includes typecheck)     |
| `npm run format`    | Prettier over the whole repo                              |

There is no test harness or eslint yet; keep `typecheck`, `build`, and
`format:check` green.

## CI

`.github/workflows/typecheck.yml` runs `npm ci && npm run typecheck` on every
pull request and on pushes to `main`. It is the only automated gate, so a PR
that does not typecheck will fail CI.

## Environment

- `KICK_PLATFORM_API_TOKEN` (required): a `kick_org_...` organization access
  token. In Cursor Cloud Agent environments it is injected as a secret env
  var; locally it can go in `.env` at the repo root (see `.env.example`).
  The backend exits at startup if it is missing and warns if it does not look
  like a `kick_org_...` token.
- `KICK_API_BASE_URL` (default `https://use-dev.kick.co/api`).
- **Gotcha:** the Kick backend serves everything under an `api` global prefix.
  The Platform API therefore lives at `https://use-dev.kick.co/api/platform/v1/...`
  — hitting `/platform/v1/...` without `/api` returns the SPA's index.html
  with status 200.
- Auth is `Authorization: Bearer <token>`. Only the backend ever holds the
  token; never expose it to frontend code.
- `PLAID_CLIENT_ID` / `PLAID_SECRET` (optional, plus `PLAID_ENV` and
  `PLAID_PRODUCTS`): the demo's own Plaid credentials for the Link flow. They
  are optional by design — `config.plaid` is `null` without them and only the
  Link flow switches off, so never make them `requireEnv`.
- `KICK_WEBHOOK_SIGNING_SECRET` (optional): the `whsec_...` secret of a webhook
  endpoint registered in Kick's webhooks portal. Optional for the same reason —
  without it deliveries are logged unverified instead of refused.

## Architecture

One vendored ts-rest contract mirroring the Platform API, used on both hops,
plus small demo-only contracts for the Plaid Link and accounting-migration
flows:

- `shared/src/contracts/platform.contract.ts` mirrors the upstream contract
  paths exactly (`/platform/v1/organization`, `/platform/v1/workspaces`,
  `/platform/v1/entities`, `/platform/v1/plaid-connections`,
  `/platform/v1/workspaces/:workspaceId/transactions`,
  `/platform/v1/entities/:entityId/chart-of-accounts`,
  `/platform/v1/entities/:entityId/account-groups`,
  `/platform/v1/entities/:entityId/accounting-migration`,
  `/platform/v1/entities/:entityId/journal-entries`,
  `/platform/v1/entities/:entityId/reports/*`).
- The backend consumes it twice: `initClient` against Kick
  (`backend/src/kick-client.ts`) and `initServer`/`createExpressEndpoints`
  mounted under `/api` (`backend/src/router.ts`, `backend/src/index.ts`), so
  the BFF exposes byte-identical paths under `http://localhost:4001/api`.
- The frontend uses `initClient` with `baseUrl: "/api"`
  (`frontend/src/api/platform.ts`); the Vite dev server proxies `/api` to the
  backend (`frontend/vite.config.ts`, override target with `BACKEND_URL`, e.g.
  `http://host.docker.internal:4001` when running inside Docker).
- Handlers are pure pass-through. Declared upstream errors
  (400/401/404/409/422/429) are forwarded verbatim; anything undeclared becomes
  a 502 via `UpstreamError`. Deleting a Plaid connection, updating a
  transaction inside a locked bookkeeping period, deleting an account that has
  journal entries, a blocked account merge and the accounting-migration routes
  (a second migration, or triggering rule generation twice) answer 409 today;
  preparing categorization and generating migration transaction rules for an
  ineligible workspace answer 422. The contract declares the same error
  superset on every route.
  The merge 409 is the one error body that is not plain `{ message }` — it
  carries structured blockers, so its handler forwards the 409 itself instead
  of going through `forwardUpstreamError`, which would flatten it. Kick
  answers a malformed request with a ts-rest validation envelope
  rather than `{ message }`, so `forwardUpstreamError` unwraps that into a
  readable 400 — without it a plain "startDate must be on or before endDate"
  reaches the caller as an opaque 502.
- The BFF runs with `responseValidation: true`, so response bodies are parsed
  through the contract schemas before leaving the backend. Any Kick-internal
  fields the upstream API may include are deliberately not modeled in
  `shared/` and get stripped — keep it that way and do not surface
  Kick-internal concepts in this demo.
- Two contracts are **not** mirrors:
  `shared/src/contracts/plaid-link.contract.ts`
  (`/demo/v1/plaid-link/{config,link-token,connections}`, implemented in
  `backend/src/plaid-link-router.ts`) and
  `shared/src/contracts/accounting-migration.contract.ts`
  (`/demo/v1/accounting-migration/run`, implemented in
  `backend/src/accounting-migration-router.ts` — see
  [The accounting migration flow](#the-accounting-migration-flow)). Keep
  demo-only routes under `/demo/` and out of `platform.contract.ts` so the
  mirror stays a mirror.
- The webhook receiver (`backend/src/webhook-router.ts`, mounted at
  `/api/demo/v1/webhooks`) is the one route with no contract at all — see
  [Receiving webhooks](#receiving-webhooks).

## The Plaid Link flow

Minting a Plaid `processor_token` is the partner's job, not Kick's, so the demo
owns the whole flow:

1. Browser asks the BFF for a link token (`/link/token/create`, filtered to USD
   depository/credit/loan accounts).
2. Plaid Link runs in the browser and returns a public token.
3. The BFF exchanges it (`/item/public_token/exchange`), resolves the account
   details — id, type, subtype, name and number mask — (from Link metadata, or
   by reading the Item when Account Select is off) and the institution id
   (from Link metadata, or by reading the Item when Link reported none), and
   calls `/processor/token/create` with `processor: "kick"` — `kick` is a
   registered Plaid processor.
4. The BFF posts only the processor token — plus the required `institutionId`,
   `accountId` and `accountType` and the optional `accountSubtype`,
   `accountName` and `accountNumberMask` — to
   `POST /platform/v1/plaid-connections`. Kick makes no Plaid account call at
   creation time: the account is created from these declared fields.

Invariants worth preserving: the Plaid access token never leaves the backend,
the browser only ever holds a link token, and Kick only ever receives a
processor token. Plaid SDK rejections are unwrapped by `toPlaidRequestError`
into a readable 400 — without it the caller only sees "Request failed with
status code 400".

## The accounting migration flow

The Platform API has no single "migrate historical books" call: the partner
starts a migration, pushes historical journal entries, then triggers rule
generation. `POST /api/demo/v1/accounting-migration/run`
(`backend/src/accounting-migration-router.ts`) chains the three upstream calls
so the Migration tab's form makes one request:

1. `POST /platform/v1/entities/:entityId/accounting-migration` — while the
   migration is open, Kick pauses automatic transaction enrichment. A 409 here
   is ambiguous (migration already exists, or the entity has opening
   balances), so the handler reads the resource: an existing migration is
   reused — that is what makes a retry after a partial failure work — and
   otherwise the original 409 is forwarded.
2. `POST .../journal-entries/bulk` — atomic upstream, so a validation failure
   creates nothing and leaves only the reusable migration behind.
3. `POST .../accounting-migration/generate-transaction-rules` — queues rule
   generation and answers 202; the migration's `enrichmentRulesSeededAt` flips
   when it finishes, and the frontend polls the mirrored `get` until then.
   Only cash-ledger lines on income/expense accounts dated in the year before
   the entity's bookkeeping start date feed generation, which is why the form
   defaults its dates to the day before that and clamps them with `max`.

The form deliberately does not expose free-form multi-line entries: each row is
one balanced two-line journal entry (debit account, credit account, amount), so
an unbalanced payload is unrepresentable. The line `description` is what rule
generation clusters on — it goes on both lines, plus the entry `memo`.

## Receiving webhooks

`POST /api/demo/v1/webhooks/kick` logs the delivery and does nothing else: no
persistence, no invalidation of a query cache, no refetch of the resource the
event is about. Keep it that way unless the demo grows a story for what a
partner should do with an event; "received something, printed it" is the whole
point of the surface today.

Three constraints hold it together:

1. **It is mounted before `express.json()`** in `backend/src/index.ts`. Kick
   signs the raw request bytes, and the global JSON parser would consume the
   stream before `express.raw()` ever saw it. Adding middleware above it in
   `index.ts` is fine; moving the JSON parser back to the top is not.
2. **It is not a ts-rest route.** Validating the body against a contract would
   reject an event Kick adds later, which is the opposite of logging whatever
   arrives. Deliveries with an unknown payload shape are logged as
   `unrecognized payload` and answered `200`.
3. **Kick sends the payload with no envelope**, and the event name lives only on
   the Svix message, so `identifyKickWebhookEvent` in
   `shared/src/schemas/webhook-event.schema.ts` names an event by matching its
   shape. Adding a new event means vendoring its payload schema there and
   listing it in `KICK_WEBHOOK_EVENTS`; two events with structurally
   indistinguishable payloads would need a real discriminator.

Signature verification uses the `svix` package with
`KICK_WEBHOOK_SIGNING_SECRET`, per-endpoint and rotatable in Kick's portal.
Deliveries that fail it are answered `400` — the only non-2xx here, since a
non-2xx just makes Svix retry.

## Source of truth for the API

The Platform API itself is the source of truth; `shared/` is a hand-maintained
mirror of it and can drift.

The schemas here describe the **wire** shapes — the JSON that actually crosses
the network, e.g. an entity's `id` as a string and timestamps as ISO strings.
When the Platform API changes, update `shared/` to match.

Enums are vendored as `as const` arrays fed to `z.enum`, which means a value
Kick adds upstream fails the BFF's response validation until it is copied here.
That is the trade for catching drift early; the enums to watch are the account
types and classes in `chart-of-accounts.schema.ts`, the report section enums
in `report.schema.ts`, and the workspace plans in `workspace.schema.ts`
(`WORKSPACE_PLANS` for reads versus the `WORKSPACE_ASSIGNABLE_PLANS` subset a
write may carry — which of those the organization can actually use comes off
the wire as `allowedPlans` on `GET /platform/v1/organization`, and that list is
what every plan picker offers).

Drift cuts the other way too, and more quietly: an extra value here only breaks
once something writes it. `ACCOUNT_TYPES` carried two types Kick does not have
while the chart was read-only, which went unnoticed until they reached a create
form. `ACCOUNT_TYPE_CLASSES` alongside it is the one piece of derived knowledge
vendored rather than read off the wire — Kick derives an account's class from
its type and never accepts it on a write, so a form offering types has to know
the rollup to group them.

## Vendored resources and deliberate gaps

Ten resources are vendored: the organization, workspaces, entities, Plaid
connections, transactions, the chart of accounts, account groups, accounting
migrations, journal entries and reports. Some upstream routes are
intentionally left out:

- Workspaces: `list`, `create`, `get` and `update`. `create` requires a `plan`
  and `update`'s body is `{ plan }` and nothing else — both mirror upstream,
  where changing the plan requires the organization to own the workspace
  billing and takes effect immediately. The upstream `delete` (permanent, with
  everything in the workspace) is deliberately not vendored: too destructive
  for a demo surface.
- Transactions: `list` and `update`. The upstream `get` is not vendored — the
  listing already carries the whole row.
- Chart of accounts: everything except `get`, for the same reason as
  transactions — the listing already carries the whole row. Note the asymmetry
  in the write surface: `update` renames and/or moves the account into an
  account group of the same type via `groupId` (type, class and code are fixed
  on creation), `disable`/`enable` archive and restore, `delete`
  is permanent but answers 409 once the account has journal entries, and
  `merge` folds one account into another and deletes the source. The wire
  shape carries no flag for which accounts refuse which write (or which pairs
  can merge), so the UI offers everything and surfaces Kick's message when it
  declines — for a blocked merge that message is built from the 409's
  structured `blockers`. `prepareCategorization` queues the mapping of Kick's
  built-in categories onto a custom chart (202, no body, asynchronous and safe
  to repeat) and answers 422 for an entity on the standard chart. The entity
  wire shape carries no chart-setup flag either, so the button is offered for
  every entity and the 422 message explains a refusal.
- Account groups: everything except `get`, again because the listing carries
  the whole row. A group's type is fixed on creation — `update` renames and/or
  re-parents (null re-roots at the top level) — and `delete` lifts the group's
  accounts and child groups to its parent, so it never answers 409. Group
  membership is not written here: it is the `groupId` field on the account,
  written through the chart-of-accounts `create`/`update` routes.
- Journal entries: only `list` and the atomic `bulkCreate`. The single
  `get`/`create`/`update`/`delete` are left out — the demo only pushes
  historical entries in bulk during an accounting migration and reads them
  back as a listing, which already carries every line. `classIds` on the write
  shape stays unused: classes themselves are not vendored.
- Accounting migrations: the full upstream surface (`create`, `get`,
  `generateTransactionRules`) is mirrored, but the UI drives the demo's own
  orchestration route instead and uses the mirrored `get` for polling; the
  mirrored writes are kept for parity and curl use, like the Plaid `create`.
- Reports: all five. The general ledger is the only one that takes
  `accountIds` / `groupIds` filters, which Kick OR-s into one selection (a
  group covers its nested subgroups). The Reports tab offers them as two
  multi-selects, cleared whenever the entity changes because ids from another
  entity are rejected. ts-rest sends arrays as indexed `key[0]=...` params,
  which is why the BFF sets a `qs` query parser with a raised `arrayLimit` in
  `backend/src/index.ts` — Express's default stops building an array past
  index 20.
- Plaid: the Platform API's `create` takes a `processor_token` and has no
  link/public token exchange. The UI goes through the demo's own Plaid Link
  routes instead; the mirrored `POST /platform/v1/plaid-connections` handler is
  kept for parity and curl use.
- Classes, ledgers and transaction rules are not vendored at all — the rules
  seeded by an accounting migration are only observable in the Kick app, not
  through this demo.

## Cash basis only

The demo keeps cash-basis books. `WorkspaceReportsPage` sends
`ledgerBasis: "cash"` on every report and offers no basis control, and the
transactions tab reads and writes `accountId` only. `accrualAccountId` and the
`accruals` ledger basis stay in `shared/` so the mirror matches upstream, but
nothing in the UI touches them — do not add an accrual surface without deciding
what the demo should say about two sets of books.

## Adding a new resource (e.g. classes, journal entries)

1. Look up the resource's routes and payloads in the Platform API docs. Note
   that resources nest under either a workspace or an entity path, e.g.
   `/platform/v1/workspaces/:workspaceId/transactions` versus
   `/platform/v1/entities/:entityId/chart-of-accounts`. An entity-scoped
   resource shown in the workspace view needs an entity picker, the way
   `WorkspaceReportsPage` does it.
2. Vendor the wire-shape schemas into `shared/src/schemas/<resource>.schema.ts`
   and add a router to `shared/src/contracts/platform.contract.ts`; re-export
   from `shared/src/index.ts`. Leave upstream `.refine()` calls off query
   schemas — they produce a `ZodEffects` rather than a `ZodObject`, and Kick
   enforces the rule anyway (see `platformReportQuerySchema`).
3. Add pass-through handlers to `backend/src/router.ts` (follow the existing
   pattern; `forwardUpstreamError` handles declared error statuses).
4. Add fetch wrappers in `frontend/src/api/platform.ts` and build pages/
   components following `WorkspacesPage` / `WorkspaceEntitiesPage`. A new
   workspace-scoped resource becomes a tab: add it to `TABS` in
   `frontend/src/pages/WorkspaceLayout.tsx`, register a nested route in
   `frontend/src/App.tsx`, and read the id from `useWorkspaceContext()` rather
   than `useParams()` so it arrives already narrowed to a string.
5. Run `npm run typecheck` and smoke-test with the curl examples in README.md.

## Conventions

- TypeScript strict everywhere; no `any`, avoid type casts — parse with Zod
  when narrowing unknown data (see `forwardUpstreamError`).
- Formatting via Prettier (4-space indent); run `npm run format`.
- Keep files small and focused; pages compose components from
  `frontend/src/components/`.
