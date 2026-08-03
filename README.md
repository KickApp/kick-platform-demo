# kick-platform-demo

Demo app for the [Kick](https://kick.co) Platform API: a React frontend and a
small Express BFF backend that list and create **workspaces** and **entities**
through the external Platform API.

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

| Variable                  | Default                     | Purpose                                     |
| ------------------------- | --------------------------- | ------------------------------------------- |
| `KICK_PLATFORM_API_TOKEN` | — (required)                | `kick_org_...` organization access token    |
| `KICK_API_BASE_URL`       | `https://use-dev.kick.co/api` | Kick API base (note the `/api` suffix)    |
| `BACKEND_PORT`            | `4001`                      | Port for the BFF backend                    |

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
```

The same paths work directly against the Kick API — replace the host with
`https://use-dev.kick.co/api` and add
`-H "Authorization: Bearer $KICK_PLATFORM_API_TOKEN"`.

## Project layout

```
shared/    Vendored Platform API contract + Zod schemas (ts-rest), used by both sides
backend/   Express BFF: authenticates to Kick, passes requests/errors through
frontend/  React app: workspaces list/create, per-workspace entities list/create
```

See [AGENTS.md](AGENTS.md) for a guide aimed at coding agents extending this
project (e.g. adding the transactions or chart-of-accounts resources).
