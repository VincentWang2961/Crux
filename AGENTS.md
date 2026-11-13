# AGENTS.md — Crux

Guide for AI coding agents (Claude Code, Codex, Cursor, …) working in this repo.
Keep it current: when you change structure, scripts, or conventions, update this file in the same commit.

## Project overview

Crux is a web application built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui**, deployed as a **Docker** container.
It is Vincent Wang's personal site: a terminal-style hero, CV sections, a server-location globe, photos, and an availability status pill.

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

Intro animation: pure CSS, no JS, and the whole sequence finishes in under 2 s. The `T` timeline at the top of `hero.tsx` sets each element's start time through the `--d` CSS variable. The prompt and heading type in character by character (`.hero-char`). The roles, the intro and the scroll hint fade and rise into place (`.hero-rise`). The caret appears when typing ends and then blinks (`.hero-caret`). The keyframes live in `globals.css`. All of it is turned off under `prefers-reduced-motion`. The name stays editable after the intro; it is the hidden way into `/admin` (see Availability → Admin page).

## CV sections (middle of the home page)

Between the hero and the globe, `page.tsx` renders About, Experience, Projects, Skills, Education and
Certifications from `src/components/showcase/cv-sections.tsx`. Each uses the shared `Section` frame
(`section.tsx`): a mono `$ command` line and the title, in a left column from `md` up, stacked on phones.
Section bodies are separated by top borders.
- All copy comes from Vincent's CV and lives in `site-data.ts` (`profile`, `experience`, `projects`,
  `skillGroups`, `education`, `certifications`). It is in **British English**.
- The CV's phone number and referees are deliberately **not** published on the site.
- Keep the look monochrome and quiet: muted labels, mono dates, outline/secondary badges, no colour accents.

## Photography & Travel (below the globe)

`photo-section.tsx` wraps `photo-spread.tsx` (a client component) in the shared `Section` frame.
Photos come from `site-data.ts` → `PHOTOS` (`src`, `alt`, `place`, `date`, `width`, `height`). The
pixel size sets each print's aspect ratio, so 4:3, 3:4, square and panoramic shots all lay out
correctly.

- **Spread:** prints are laid out like photos on a table.
  - Tunables at the top of `photo-spread.tsx`: the long edge is `LONG_EDGE_REM`, and each print's tilt
    and drop come from the `TILT` and `DROP` arrays.
  - From `md` up, prints are absolutely positioned across the width and neighbours overlap. Hover or
    keyboard focus lifts a print to the top, straightens it and scales it up.
  - On phones it becomes a horizontal swipe strip of the same overlapping prints, with snap scrolling.
- **Lightbox:** clicking a print opens a native `<dialog>` (`showModal`).
  - The photo fills most of the screen: up to 92vw by 82svh.
  - The page behind is blurred through `::backdrop`, and page scroll is locked
    (`html:has(dialog[open])` in `globals.css`).
  - It closes with Esc, the close button or a click outside the photo. ←/→ and the caption arrows step
    through the photos.
  - **Open/close transition (FLIP, using the Web Animations API):**
    - On open, the lightbox image starts exactly over the clicked print, matching its position, size and
      tilt. It then flies to the centre and straightens over `OPEN_MS`, while the blurred backdrop fades in.
    - The caption and the close button fade in a moment later.
    - On close, the photo flies back into its slot over `CLOSE_MS`. If you stepped with ←/→, that is the
      current photo's slot.
    - While its photo is open, the print in the spread is hidden, so the two read as one object.
    - ←/→ steps with a short slide and fade.
    - Esc goes through the animated close: `onCancel` calls `preventDefault`.
    - **What flies is the print's own cached thumbnail.** The lightbox shows a placeholder: a plain
      `<img>` reusing the thumbnail's `currentSrc`. That URL is already loaded, so the photo is visible
      from the very first frame, with no white box and no waiting on the network.
    - The full-resolution `next/image` fades in over the placeholder on the native `load` event.
      Don't use next/image's `onLoad`, which waits for `decode()`.
    - Full-res files are preloaded on hover, focus and pointer-down, and the ←/→ neighbours are preloaded
      while the lightbox is open. Preloading uses `getImageProps`, with the same `lightboxSizes()` string
      as the render, so both resolve to the same URL.
    - The frame stays invisible over the print until the placeholder can paint, and only then do the
      print and the frame swap.
    - The lightbox image gets its size from the photo's aspect ratio, not from the loaded file. Without
      that, it lays out at 0 px before load and the FLIP measurement breaks.
    - **Photo is mapped onto photo:** the lightbox frame *is* the photo box, with the exact aspect
      ratio. The FLIP maps it onto the print's `<img>`, using unrounded computed widths, not
      `offsetWidth`. This keeps the last frame pixel-exact: a print's border box has a different aspect
      ratio from its photo, which caused a small jump at the end.
    - The lightbox's white border is the first `box-shadow` ring, outside the box, so it doesn't affect
      layout. It is the same `BORDER_PX` (6 px) as the print's padding.
    - During the transition, the ring, the corner radius and the drop shadow are counter-scaled
      (`frameStyle`, ÷ scale). On screen the border stays 6 px from start to finish, and it lands
      exactly on the print's border.
    - **Stacking is dynamic:** the `order` state lists the prints from bottom to top. The print last
      hovered, focused or opened (including by stepping) moves to the top and stays there, so a closed photo
      lands on top of the pile and never slides under its neighbours.
    - **Swipe:** in the lightbox, drag the photo with touch, pen or mouse. It follows the finger with a
      slight tilt. Releasing past `SWIPE_DISTANCE`, or after a flick faster than `SWIPE_VELOCITY`, changes
      photo: swipe left for the next one. Anything less springs back. The frame is `touch-none`, and
      pointer capture keeps tracking outside the photo.
    - Under reduced motion, everything opens and closes instantly.
  - Don't put transforms on the `<dialog>` itself. That would make it the containing block for the fixed
    close button, so animate the `<figure>` instead.
- **Photos:** real photos are JPGs in `public/photos/`. `next/image` serves them as resized WebP.
  `date` is optional.
  - Files must be world-readable (`chmod 644`). The Dockerfile also `chown`s `public/` to the non-root
    `nextjs` user, because uploads often arrive as mode 600, which made the image optimiser return 500.

## Availability (status pill in the hero bar)

The hero's top bar holds a status pill next to the theme toggle. It answers first, with the current
status and the next change, for example "● Unavailable · free 08:00" or "● Available · until 17:00".
Clicking the pill unfolds a panel that shows the coming week, from today through the same weekday next
week (for example Sat 14 to Sat 21). This is a rolling window of 8 days.

| File | Role |
| --- | --- |
| `src/lib/availability.ts` | Types, the `AvailabilitySource` interface, the date and time helpers, the demo template, file storage, `getAvailability()`, `validateUpdates()` and `saveAvailabilityDays()`. |
| `src/components/showcase/availability-status.tsx` | Server wrapper. It renders the pill at request time, through `connection()` inside `<Suspense>`, so the rest of the hero stays static (the route is partially prerendered). The fallback is an empty pill outline. |
| `src/components/showcase/availability-pill.tsx` | Client component: the pill, the panel and the timeline bars. |
| `src/app/api/availability/route.ts` | `GET /api/availability` returns the same `AvailabilityWindow` as JSON (`no-store`). |

**Pill**
- It shows a coloured dot, the status, and a hint:
  - `until HH:MM` while available;
  - otherwise `free HH:MM`, or `free Mon HH:MM` when the next free time is another day.
- The dot pulses softly only while available.

**Panel**
- Each day is drawn as a free/busy timeline bar over 00–24, the Outlook / Google Calendar pattern.
  - Consecutive slots with the same status and note are merged into one segment (`segmentsOf`).
  - Past time is dimmed. A vertical line marks "now" on today's bar, and today's label is a filled pill.
- Below the bars, the selected or hovered segment is spelled out in words (`aria-live`), followed by a
  legend.
- Placement:
  - On phones the panel spans the hero bar, because the wrapper is only `sm:relative`.
  - From `sm` up it hangs from the pill's right edge and is `26rem` wide.

**Animation**
- Opening reveals the panel from the pill's corner. It animates `clip-path: inset(...)` together with
  opacity and scale (`OPEN_MS`).
- The day rows fade in one after another (`ROW_STAGGER_MS`). The panel header shows the local time and
  the date range.
- Closing reverses this, and `visibility` flips at the end.
- Reduced motion turns all of it off.

**Accessibility**
- The pill has `aria-expanded` and `aria-controls`.
- While closed, the panel is `inert`.
- Esc closes the panel and returns focus to the pill. Clicking outside also closes it.
- Every segment is a button with a full label, for example "Tuesday 10 November, 09:00 to 17:00:
  Unavailable, At work".
- Keyboard navigation uses a roving tabindex:
  - ←/→ move between segments.
  - ↑/↓ move to another day while keeping the time of day.
  - Home and End jump to the first or last segment.
- Colour is backed by lightness steps (the `--avail-*` tokens in `globals.css`) and by the text
  detail line.

**Data model**
- Storage holds blocks: `AvailabilityBlock { date, start, end, status, note? }`.
  - Times are local `"HH:MM"`, `end` is exclusive, and `"24:00"` is allowed.
- `getAvailability()` samples the blocks into slots of `AVAILABILITY_SLOT_HOURS` (1 or 2) between
  `AVAILABILITY_DAY_START` and `AVAILABILITY_DAY_END` (currently 0–24). The window starts today and runs
  for `AVAILABILITY_DAYS` days (currently 8).
- Overlaps take the most restrictive status. Time that no block covers falls back to `DEFAULT_STATUS`.
- Dates are `YYYY-MM-DD` strings in `AVAILABILITY_TIMEZONE` (`Australia/Perth`). Date arithmetic and
  formatting use UTC.

**Demo data:** `demoSource` provides a weekly pattern (nights, work, evenings, weekends) plus a few
overrides, keyed by their offset from today.

### Admin page (`/admin`) and write API

A deliberately simple page whose only job is editing availability.

**Hidden entry from the hero** (`editable-name.tsx`)
- "Vincent Wang!" in the heading types in with the intro, then stays editable like a terminal line.
  - You can click the name, or just start typing while the hero is on screen.
  - The caret always stays at the end.
  - Space only starts editing once you are already editing, so Space still scrolls the page.
- Anything typed after `admin@` is shown as `*`.
- Logging in:
  - Each change after `admin@` is debounced (`SUBMIT_DEBOUNCE_MS`) and posted to `POST /api/admin/login`.
    Enter submits immediately.
  - On success the name reads "access granted" and the page goes to `/admin`.
  - Esc, or leaving the field with a password attempt in it, puts the name back.
- How it is built:
  - A transparent `<input>` (`tabIndex=-1`, kept off the tab order on purpose) sits over the name, so
    phones get a keyboard on tap.
  - `Typed` and `delay` live in `typed.tsx`, shared by the server hero and this client component.

**Auth** (`src/lib/admin-auth.ts`)
- **Password check:** the password is `ADMIN_PASSWORD`, compared on the server only, in constant time.
  It is never in the repo or the client bundle.
- **Session cookie:** a successful login sets `crux_admin`, an httpOnly, SameSite=Strict cookie
  valid for 12 hours.
  - Its value is `<expiry>.<HMAC-SHA256>`, signed with `ADMIN_SESSION_SECRET`.
  - It is marked `Secure` whenever the request arrived over HTTPS (directly or via `x-forwarded-proto`).
- **Re-verification:** `isAdmin()` re-checks the cookie in the `/admin` page and in every write. The
  `/admin` page reads the cookie inside `<Suspense>` and redirects to `/` without a valid session.
- **Rate limit:** 30 failed logins per client per 10 minutes, kept in memory, then `429`.
- **Logout:** `DELETE /api/admin/login`.

**Editor** (`src/components/admin/availability-editor.tsx`)
- Rows are the 8 days in the window, columns are hours.
- To paint: pick a brush (a status, plus an optional note of up to 80 characters), then click or drag
  across hours.
  - Painting works with mouse, pen or touch.
  - On a fast drag, every hour skipped within the row is filled in.
- Changed days are marked. "Save N days" sends them; "discard" reverts them.
- Notes show in each cell's tooltip and spoken label.

**Write API:** `PUT /api/availability`, admin session required.
- **Body:** `{ "days": [{ "date": "YYYY-MM-DD", "blocks": [{ "start", "end", "status", "note"? }] }] }`.
  - Each listed day is replaced whole.
  - An empty `blocks` array saves a day with no blocks, which is all `DEFAULT_STATUS`.
- **Validation** (`validateUpdates`):
  - Dates are `YYYY-MM-DD`.
  - Times are on the hour or half hour, with `start < end ≤ 24:00`.
  - Status is one of the three values.
  - A note is 80 characters or fewer.
  - Blocks don't overlap.
  - At most 31 days per request.
- **Responses:** `204` on success, `401` without a session, `400` for invalid input.

**Storage:** `fileSource` in `availability.ts` reads and writes `availability.json` in
`AVAILABILITY_DATA_DIR` (default `./data`, which is git-ignored).
- The file holds `{ days: { "YYYY-MM-DD": Block[] } }`.
- Writes are atomic: the file is written to a temp file, then renamed.
- Days more than 30 days old are pruned.
- A day that was never saved falls back to the demo template, so the site looks sensible before the first edit.
  To make unsaved days plain `DEFAULT_STATUS` instead, drop the template from `fileSource.getRange`.
- **Docker:** the image sets `AVAILABILITY_DATA_DIR=/app/data`, owned by `nextjs`.
  `docker-compose.yml` mounts the named volume `crux-data` there, so edits survive rebuilds.
- **Swapping storage:** to move to a database later, implement another `AvailabilitySource` plus a
  save function, then point `source` at it.

## Theme (light / dark)

Dark mode is the `.dark` class on `<html>` (Tailwind `@custom-variant dark`, tokens in `globals.css`).
- **Default follows the OS.** An inline script in `layout.tsx` (`themeScript`) runs before first paint: it
  applies `dark` when `localStorage["theme"]` is `"dark"`, or when nothing is stored and
  `prefers-color-scheme: dark` matches. It also sets `color-scheme` and keeps listening for OS changes. It
  exposes `window.__applyTheme`.
- **The toggle** (`theme-toggle.tsx`) stores an explicit choice. If the chosen theme equals the OS theme,
  it clears the key instead, so the page goes back to following the OS.
- **Switch animation:** the toggle is a round button. Clicking it runs `document.startViewTransition`, and the
  new theme grows out of the button as a `clip-path` circle on `::view-transition-new(root)` until it covers
  the viewport (`REVEAL_MS`). The default cross-fade is turned off in `globals.css`. Browsers without View
  Transitions, and reduced motion, switch instantly.
- `<html>` has `suppressHydrationWarning` because the script changes its class before hydration.
  `viewport.themeColor` tints the mobile browser chrome for each scheme.
- The dark palette is dark grey, not pure black: `--background` is `oklch(0.235 0 0)`, about `#1e1e1e` (VS Code dark), and cards and muted surfaces step up slightly. If you change the background, keep `themeColor` in sync.

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
| `ADMIN_PASSWORD` | `/api/admin/login` | Admin password (typed after `admin@` over the hero name). Server-only. |
| `ADMIN_SESSION_SECRET` | `admin-auth.ts` | At least 32 random characters; signs the admin session cookie. Changing it logs everyone out. |
| `AVAILABILITY_DATA_DIR` | `availability.ts` | Folder for `availability.json` (default `./data`; `/app/data` in Docker). |

## Git conventions

- Commit as the local git user. **Do not add AI attribution** (no `Co-Authored-By: Claude`, no "Generated with …" lines) to commits or PRs.
- Small, focused commits with imperative messages (e.g. `Add login form`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
