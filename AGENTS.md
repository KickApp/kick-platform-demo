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

## Architecture

One vendored ts-rest contract mirroring the Platform API, used on both hops,
plus a small demo-only contract for the Plaid Link flow:

- `shared/src/contracts/platform.contract.ts` mirrors the upstream contract
  paths exactly (`/platform/v1/workspaces`, `/platform/v1/entities`,
  `/platform/v1/plaid-connections`,
  `/platform/v1/workspaces/:workspaceId/transactions`,
  `/platform/v1/entities/:entityId/chart-of-accounts`,
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
  (400/401/404/409/429) are forwarded verbatim; anything undeclared becomes a
  502 via `UpstreamError`. Deleting a Plaid connection and updating a
  transaction inside a locked bookkeeping period are the only routes that
  answer 409 today, but the contract declares the same error superset on every
  route.
- The BFF runs with `responseValidation: true`, so response bodies are parsed
  through the contract schemas before leaving the backend. Any Kick-internal
  fields the upstream API may include are deliberately not modeled in
  `shared/` and get stripped — keep it that way and do not surface
  Kick-internal concepts in this demo.
- `shared/src/contracts/plaid-link.contract.ts` is the one contract that is
  **not** a mirror: `/demo/v1/plaid-link/{config,link-token,connections}`
  exist only here, implemented in `backend/src/plaid-link-router.ts`. Keep
  demo-only routes under `/demo/` and out of `platform.contract.ts` so the
  mirror stays a mirror.

## The Plaid Link flow

Minting a Plaid `processor_token` is the partner's job, not Kick's, so the demo
owns the whole flow:

1. Browser asks the BFF for a link token (`/link/token/create`, filtered to USD
   depository/credit/loan accounts).
2. Plaid Link runs in the browser and returns a public token.
3. The BFF exchanges it (`/item/public_token/exchange`), resolves the account
   id (from Link metadata, or by reading the Item when Account Select is off),
   and calls `/processor/token/create` with `processor: "kick"` — `kick` is a
   registered Plaid processor.
4. The BFF posts only the processor token to
   `POST /platform/v1/plaid-connections`.

Invariants worth preserving: the Plaid access token never leaves the backend,
the browser only ever holds a link token, and Kick only ever receives a
processor token. Plaid SDK rejections are unwrapped by `toPlaidRequestError`
into a readable 400 — without it the caller only sees "Request failed with
status code 400".

## Source of truth for the API

The Platform API itself is the source of truth; `shared/` is a hand-maintained
mirror of it and can drift.

The schemas here describe the **wire** shapes — the JSON that actually crosses
the network, e.g. an entity's `id` as a string and timestamps as ISO strings.
When the Platform API changes, update `shared/` to match.

Enums are vendored as `as const` arrays fed to `z.enum`, which means a value
Kick adds upstream fails the BFF's response validation until it is copied here.
That is the trade for catching drift; the enums to watch are the account types
and classes in `chart-of-accounts.schema.ts` and the report section enums in
`report.schema.ts`.

## Vendored resources and deliberate gaps

Six resources are vendored: workspaces, entities, Plaid connections,
transactions, the chart of accounts and reports. Some upstream routes are
intentionally left out:

- Transactions: `list` and `update`. The upstream `get` is not vendored — the
  listing already carries the whole row.
- Chart of accounts: `list` only. The demo reads the chart to show and pick
  account names and never edits it, so `get`, `create`, `bulkCreate`,
  `update`, `disable`, `enable` and `delete` are all left out.
- Plaid: the Platform API's `create` takes a `processor_token` and has no
  link/public token exchange. The UI goes through the demo's own Plaid Link
  routes instead; the mirrored `POST /platform/v1/plaid-connections` handler is
  kept for parity and curl use.
- Classes, journal entries, ledgers and transaction rules are not vendored at
  all.

## Cash basis only

The demo keeps cash-basis books. `WorkspaceReportsPage` sends
`ledgerBasis: "cash"` on every report and offers no basis control, and the
transactions tab reads and writes `accountId` only. `accrualAccountId` and the
`accruals` ledger basis stay in `shared/` so the mirror matches upstream, but
nothing in the UI touches them — do not add an accrual surface without deciding
what the demo should say about two sets of books.

## Adding a new resource (e.g. classes, journal entries)

1. Look up the resource's routes and payloads in the Platform API docs. Note
   that some resources nest under a workspace path, e.g.
   `/platform/v1/workspaces/:workspaceId/transactions`.
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
