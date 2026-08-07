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

## Architecture

Single vendored ts-rest contract, used on both hops:

- `shared/src/contracts/platform.contract.ts` mirrors the upstream contract
  paths exactly (`/platform/v1/workspaces`, `/platform/v1/entities`,
  `/platform/v1/plaid-connections`,
  `/platform/v1/workspaces/:workspaceId/transactions`).
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
  502 via `UpstreamError`. Only the Plaid connection delete answers 409 today,
  but the contract declares the same error superset on every route.
- The BFF runs with `responseValidation: true`, so response bodies are parsed
  through the contract schemas before leaving the backend. Any Kick-internal
  fields the upstream API may include are deliberately not modeled in
  `shared/` and get stripped — keep it that way and do not surface
  Kick-internal concepts in this demo.

## Source of truth for the API

The authoritative contracts live in the main kick repo:

- `common/contracts/platform/*.platform.contract.ts`
- `common/schemas/platform/*.platform.schema.ts`

The copies in `shared/` are deliberately standalone (no `@common/...`
imports) and describe the **wire** shapes: the upstream repo's response
schemas contain server-side `.transform`s from DB rows (e.g. entity `uuid` →
wire `id`, `Date` → ISO string); here the post-transform JSON is modeled
directly. When the upstream contract changes, update `shared/` to match.

## Vendored resources and deliberate gaps

Four resources are vendored: workspaces, entities, Plaid connections and
transactions. Some upstream routes are intentionally left out:

- Transactions: only `list`. The upstream `get` and `update` (`PATCH`) routes
  are not vendored, so the demo never writes to a transaction.
- Plaid: `create` takes a `processor_token` the partner obtained from its own
  Plaid Link flow — there is no link/public token exchange on this surface, and
  this demo has no Plaid credentials, so the create form asks for a pasted
  token. Creation can therefore only be smoke-tested up to the upstream 400.
- Chart of accounts, classes, journal entries and reports are not vendored at
  all.

## Adding a new resource (e.g. chart of accounts, journal entries)

1. Look up the upstream contract and schemas in the kick repo
   (`chart-of-accounts.platform.contract.ts`, `journal-entries.platform.contract.ts`).
   Note that some contracts nest under a workspace path, e.g.
   `/platform/v1/workspaces/:workspaceId/transactions`.
2. Vendor the wire-shape schemas into `shared/src/schemas/<resource>.schema.ts`
   and add a router to `shared/src/contracts/platform.contract.ts`; re-export
   from `shared/src/index.ts`.
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
