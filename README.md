# Crux

Web application built with [Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com), deployed with Docker.

## Development

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Add UI components with `npx shadcn@latest add <component>`.

## Deployment (Docker)

```bash
cp .env.example .env   # adjust values
docker compose up -d --build
```

The image uses Next.js standalone output and exposes port 3000, with a healthcheck at `/api/health`.

## For contributors & AI agents

See [AGENTS.md](AGENTS.md) for project structure, conventions and commands.

## License

[MIT](LICENSE)
