# CLAUDE.md — Developer Context

## Project

**Family Hub** — a shared family planning and admin PWA. See `VISION.md` for full product vision.

Started as a shared calendar (jj-cal) and evolving into a full family hub.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 5 (Svelte 5 runes) |
| Runtime | Cloudflare Workers |
| Database | Turso (libSQL) via Drizzle ORM |
| Dates | Temporal API |
| Styles | Tailwind CSS |
| Package manager | pnpm |
| Deployment | Cloudflare Pages |

## Key conventions

- **Timezone**: All dates stored as UTC, displayed in Sydney time (Australia/Sydney)
- **RPC pattern**: Client/server communication uses a query/command RPC pattern (not REST endpoints)
- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect` — no legacy Svelte 4 store patterns
- **Mobile-first**: All new UI should be designed mobile-first, then enhanced for desktop
- **PWA**: Keep service worker and manifest up to date when adding new routes/assets

## Project structure

```
src/
  lib/
    server/     # Server-only code (DB, auth)
    components/ # Shared Svelte components
  routes/       # SvelteKit file-based routes
```

## Running locally

```bash
pnpm dev
```

## Notes for AI assistants

- Always check `VISION.md` for product direction before suggesting features
- Prefer editing existing files over creating new ones
- Use beans (the project's issue tracker) to track all work — run `beans list` to see current issues
- The app uses a query/command RPC pattern — follow existing patterns when adding new data operations
