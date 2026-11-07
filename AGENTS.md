# AGENTS.md — Crux

Guide for AI coding agents (Claude Code, Codex, Cursor, …) working in this repo.
Keep it current: when you change structure, scripts, or conventions, update this file in the same commit.

## Project overview

Crux is a web application built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui**, deployed as a **Docker** container.
It is Vincent Wang's personal site: a terminal-style hero, CV sections and a server-location globe.

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

## Hero (first screen)

`src/components/showcase/hero.tsx`, with copy in `site-data.ts` → `hero`. It is at least one *large*
viewport tall (`min-h-lvh`, i.e. browser toolbars retracted) so the next section never peeks in on iOS
Safari, whose toolbars collapse or float over the page. The scroll hint's bottom margin adds
`100lvh - 100svh`, which keeps it above the toolbar while the toolbar is shown (the offset is 0 on desktop).
The rest of the page starts at `#content` below it. It is terminal-styled: monospace
JetBrains Mono (`font-mono`, loaded via `next/font` in `layout.tsx`), a `$ whoami` prompt, and a blinking
caret. The copy is **British English** (`lang="en-GB"` on the section).

Responsive design is **mobile-first, not just scaled down**:
- **Phones:** the content block is vertically centred, slightly above centre (`pb-[6svh]`). Roles stack as a list, and a dashed divider sits above the intro. Touch targets are 40–44 px. Safe-area insets are respected (`viewportFit: "cover"` in `layout.tsx`).
- **`sm` and up:** the content block is vertically centred and the roles sit on one row.
- **Heading:** its size is fluid, `clamp(2rem, 10vw, 4.5rem)`, so the name fills a phone's width without wrapping.

Intro animation: pure CSS, no JS, and the whole sequence finishes in under 2 s. The `T` timeline at the top of `hero.tsx` sets each element's start time through the `--d` CSS variable. The prompt and heading type in character by character (`.hero-char`). The roles, the intro and the scroll hint fade and rise into place (`.hero-rise`). The caret appears when typing ends and then blinks (`.hero-caret`). The keyframes live in `globals.css`. All of it is turned off under `prefers-reduced-motion`.

## CV sections (middle of the home page)

Between the hero and the globe, `page.tsx` renders About, Experience, Projects, Skills, Education and
Certifications from `src/components/showcase/cv-sections.tsx`. Each uses the shared `Section` frame
(`section.tsx`): a mono `$ command` line and the title, in a left column from `md` up, stacked on phones.
Section bodies are separated by top borders.
- All copy comes from Vincent's CV and lives in `site-data.ts` (`profile`, `experience`, `projects`,
  `skillGroups`, `education`, `certifications`). It is in **British English**.
- The CV's phone number and referees are deliberately **not** published on the site.
- Keep the look monochrome and quiet: muted labels, mono dates, outline/secondary badges, no colour accents.

## Theme (light / dark)

Dark mode is the `.dark` class on `<html>` (Tailwind `@custom-variant dark`, tokens in `globals.css`).
- **Default follows the OS.** An inline script in `layout.tsx` (`themeScript`) runs before first paint: it
  applies `dark` when `localStorage["theme"]` is `"dark"`, or when nothing is stored and
  `prefers-color-scheme: dark` matches. It also sets `color-scheme` and keeps listening for OS changes. It
  exposes `window.__applyTheme`.
- **The toggle** (`theme-toggle.tsx`) stores an explicit choice. If the chosen theme equals the OS theme,
  it clears the key instead, so the page goes back to following the OS.
- `<html>` has `suppressHydrationWarning` because the script changes its class before hydration.
  `viewport.themeColor` tints the mobile browser chrome for each scheme.

## Matrix globe (server deployment map)

Purpose: shows where the maintainer's servers are deployed. Lives at the bottom of the home page.

| File | Role |
| --- | --- |
| `src/components/showcase/matrix-globe.tsx` | Client component, Canvas 2D renderer (no three.js). Style reference: cloudflare.com "Region: Earth" globe, monochrome. Dense land-only dots on a Fibonacci sphere lattice (uniform, no pole artefacts), rim-darkening, drag/inertia/auto-rotate, node badges, labels. Tunables are constants at the top. |
| `src/components/showcase/globe-section.tsx` | Section wrapper (title only, no card — the globe floats on the page). |
| `src/lib/site-data.ts` → `SERVER_NODES` | Node list: `id`, `name`, `lat`, `lon`, `label` quadrant (`ne/nw/se/sw`) to keep name tags from overlapping. |
| `src/lib/land-mask.ts` | Generated 0.5° land/ocean bitmap (Natural Earth 50m, scanline-rasterised); each dot samples its centre against it. Regenerate with `scripts/gen-land-mask.mjs`; never edit by hand. |

Design rules: monochrome only — very light grey sphere (no graticule); land is a
dense field of small grey dots (no ocean dots) that grow more opaque towards the rim; nodes are
white badges with a dark border; no country borders; labels are dark pills with white sans-serif
text.
Server-only values must not be imported from the `"use client"` file into Server Components — keep
shared data in `site-data.ts`.

### Planned: links between server nodes (not implemented yet)

Nodes will later be connected by line segments (e.g. replication / network topology). Prepared for:
- Every node has a stable `id`; links should be declared in `site-data.ts` as
  `SERVER_LINKS: { from: ServerNode["id"]; to: ServerNode["id"] }[]`.
- Render links as **great-circle arcs**: slerp between the two node unit vectors, lift the midpoint
  slightly above the surface (scale by ~1.05–1.15 depending on distance) so arcs read as 3D, and
  hide/fade segments whose rotated `z <= 0` (back side of the globe).
- Insert drawing at the `[Future] SERVER_LINKS` comment in `matrix-globe.tsx` — after land dots,
  before node markers and labels — keeping the white/grey palette (optionally an animated dash).

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
