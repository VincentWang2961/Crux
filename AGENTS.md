# AGENTS.md — Crux

Guide for AI coding agents (Claude Code, Codex, Cursor, …) working in this repo.
Keep it current: when you change structure, scripts, or conventions, update this file in the same commit.

## Project overview

Crux is a web application built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui**, deployed as a **Docker** container.
The product scope is still being defined; the repo currently contains the scaffold only.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, `src/` dir, Turbopack, `cacheComponents` enabled) |
| Language | TypeScript (strict), import alias `@/*` → `src/*` |
| Styling | Tailwind CSS v4 (config lives in `src/app/globals.css`, no `tailwind.config`) |
| UI | shadcn/ui, style `base-nova`, built on `@base-ui/react`; icons from `lucide-react` |
| Class merging | `cn()` from `@/lib/utils` (re-exports the `cn` package) |
| Lint | ESLint 9 flat config (`eslint.config.mjs`, `eslint-config-next`) |
| Package manager | **npm** (`package-lock.json` is the lockfile — don't add pnpm/yarn lockfiles) |
| Deploy | Multi-stage `Dockerfile` using Next.js `output: "standalone"` |

## Directory structure

```
.
├── src/
│   ├── app/                 # App Router: routes, layouts, route handlers
│   │   ├── layout.tsx       # Root layout (fonts, <html>/<body>)
│   │   ├── page.tsx         # Home page "/"
│   │   ├── globals.css      # Tailwind v4 + shadcn theme tokens (CSS variables)
│   │   └── api/health/      # GET /api/health → {status:"ok"} (Docker healthcheck)
│   ├── components/
│   │   └── ui/              # shadcn-generated primitives (managed by shadcn CLI)
│   └── lib/
│       └── utils.ts         # cn() helper
├── public/                  # Static assets served from "/"
├── components.json          # shadcn CLI config (aliases, style, base color)
├── next.config.ts           # Next config (standalone output, turbopack rules)
├── Dockerfile               # deps → builder → runner (node:22-alpine, non-root)
├── docker-compose.yml       # Local/production compose, port ${PORT:-3000}
├── .env.example             # Committed env template; real values go in .env (ignored)
├── AGENTS.md                # This file
└── CLAUDE.md                # Claude Code entry point → imports AGENTS.md
```

Conventions for new code:
- Feature components → `src/components/<feature>/`; shared hooks → `src/hooks/`; non-UI logic → `src/lib/`.
- Prefer Server Components; add `"use client"` only where interactivity is needed.
- Don't hand-edit files in `src/components/ui/` beyond small tweaks — regenerate with the shadcn CLI.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (also type-checks)
npm run start      # serve the production build
npm run lint       # ESLint

npx shadcn@latest add <component>   # add a shadcn/ui component into src/components/ui

docker compose up -d --build        # build & run the container
docker build -t crux . && docker run -p 3000:3000 crux
```

Before committing, run `npm run lint` and `npm run build`; both must pass.

**After every change, redeploy the container** so the maintainer can view and debug the latest version:

```bash
docker compose up -d --build && curl -fsS http://localhost:3000/api/health
```

The running container is named `crux` and serves http://localhost:3000.

## Environment variables

- Template: `.env.example` (committed). Copy to `.env` / `.env.local` for real values — these are git-ignored.
- Only variables prefixed `NEXT_PUBLIC_` reach the browser; never put secrets in them.
- When adding a variable, add it to `.env.example` and document it here.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | docker compose | Host port mapped to container port 3000 |

## Git conventions

- Commit as the local git user. **Do not add AI attribution** (no `Co-Authored-By: Claude`, no "Generated with …" lines) to commits or PRs.
- Small, focused commits with imperative messages (e.g. `Add login form`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
