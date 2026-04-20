# CLAUDE.md — Developer Context

## Project

**JJ Cal** — a shared family planning and admin PWA. See `VISION.md` for full product vision.

Started as a shared calendar (jj-cal) and evolving into a full family hub.

## Tech stack

| Layer           | Technology                                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| Framework       | SvelteKit 5 (Svelte 5 runes)                                                             |
| Runtime         | Cloudflare Workers                                                                       |
| Database        | Turso (libSQL) via Drizzle ORM                                                           |
| Dates           | Temporal API                                                                             |
| Styles          | Plain CSS in Svelte `<style>` blocks, driven by design tokens in `src/styles/tokens.css` |
| Package manager | pnpm                                                                                     |
| Deployment      | Cloudflare Pages                                                                         |

## Key conventions

- **Timezone**: All dates stored as UTC, displayed in Sydney time (Australia/Sydney)
- **RPC pattern**: Client/server communication uses a query/command RPC pattern (not REST endpoints)
- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect` — no legacy Svelte 4 store patterns
- **Mobile-first**: All new UI should be designed mobile-first, then enhanced for desktop
- **PWA**: Keep service worker and manifest up to date when adding new routes/assets
- **Design tokens**: All styling goes through CSS custom properties defined in `src/styles/tokens.css`. See the strict styling rules below.

## Styling rules (strict)

All UI styling MUST use the CSS custom properties defined in `src/styles/tokens.css`. No raw values in component `<style>` blocks. This rule exists so that global tweaks to the design system can be made in one place without touching individual components.

### Forbidden

- Hex colours (`#111827`), named colours (`black`, `white`, `red`), `rgb()`/`rgba()`/`hsl()` literals
- Raw pixel or rem values for spacing (padding, margin, gap), font size, border radius, shadow
- Magic z-index numbers (`z-index: 40`)
- Hardcoded transition durations or easing functions
- Hardcoded font families or font stacks

### Required

| Property                       | Token                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| Colours                        | `var(--color-*)`                                              |
| Spacing (padding, margin, gap) | `var(--space-*)`                                              |
| Font family                    | `var(--font-body)`, `var(--font-heading)`, `var(--font-mono)` |
| Font size                      | `var(--font-size-*)`                                          |
| Font weight                    | `var(--font-weight-*)`                                        |
| Line height                    | `var(--line-height-*)`                                        |
| Letter spacing                 | `var(--letter-spacing-*)`                                     |
| Border radius                  | `var(--radius-*)`                                             |
| Shadow                         | `var(--shadow-*)`                                             |
| Transition duration            | `var(--duration-*)`                                           |
| Transition easing              | `var(--ease-*)`                                               |
| Z-index                        | `var(--z-*)`                                                  |
| Safe area insets               | `var(--safe-top/bottom/left/right)`                           |
| Max content width              | `var(--layout-max-width)`                                     |
| Page gutter                    | `var(--layout-gutter)`                                        |

### Allowed raw values (exceptions)

- `0`, `100%`, `auto`, `none`, `inherit`, `currentColor`, `transparent`
- Fractional grid units (`1fr`, `minmax(...)`)
- Border widths in pixels (`1px`, `2px`) — no token yet; add one if the set grows
- `env(safe-area-inset-*)` directly is discouraged — prefer `var(--safe-*)`

### Adding new tokens

If you need a value that doesn't have a token, **add one to `src/styles/tokens.css`** in the correct section, then use it. Do not inline the raw value. When adding a colour token, you MUST also add its counterpart in the `@media (prefers-color-scheme: dark)` block at the bottom of the same file.

### Retrofitting existing components

Some existing components (e.g. `BottomNav.svelte`, `FAB.svelte`) still contain raw values from before this rule. Do not retrofit them as a side effect of other work — retrofits are tracked as their own beans. New or modified components must follow the rules above.

## Data, optimistic UI, and offline

The app uses SvelteKit 5 experimental **remote functions** (`query`, `form`, `command` from `$app/server`). Follow these rules when wiring a route to data. The pattern is demonstrated end-to-end in `src/routes/lists/[listId]/`.

### Remote queries are the source of truth

- Read data from the query's cache (`getItems().current`), not from a parallel `$state` array. Shadowing the query defeats `.withOverride` and makes every mutation a manual bookkeeping job.
- Derive views with `$derived` from `.current` (e.g. `incomplete`, `recentlyCompleted`). Don't cache derived shapes in `$state`.

### Route-scoped stores

- A page that owns more than one or two mutations should expose a `createXStore(...)` factory in a `x-store.svelte.ts` co-located with the route. The factory encapsulates the remote calls, optimistic overrides, and offline handling so the `+page.svelte` stays dumb (rendering + form wiring only).
- Never module-level `$state` for route data — the factory ties lifetime to the component.
- For a page with a single mutation, inline `.withOverride` on the query is fine (see `calendars/+page.svelte` for that shape).

### Optimistic UI with `.withOverride`

- Use `query.withOverride((current) => next)` to get a release function, then pass it to `form.submit().updates(override)`. SvelteKit ties the override's lifetime to the submission — no manual cleanup.
- Overrides MUST be idempotent transforms: **upsert-by-id** for add, explicit-value for toggle/edit, filter for delete. A refresh that arrives mid-flight must not duplicate or lose state.
- Don't add "pending" styles. Full-optimistic — UI commits immediately, server reconciles.

### Single-flight mutations

- In each `form`/`command` handler, end with `void getAffectedQuery().refresh()` (no `await`). SvelteKit piggy-backs the fresh query onto the mutation response — one round trip, no extra fetch.
- Refresh every query whose results depend on the mutation, on both the current route and any parent (e.g. `tasks` refreshes both `'mine'` and `'all'` task queries).

### Offline queue

- Writes while offline go through `offlineQueue.enqueue(form.action, encodedForm)` (see `lib/offline-queue.svelte.ts`). Overrides applied at enqueue time are kept alive — the store stashes the release fn in an `offlineReleases` set.
- On reconnect, `offlineQueue.onDrained(...)` fires: refresh the affected queries, then release all stashed overrides. The refresh lands real server state before the optimistic override goes away.
- A page that mutates data MUST route its writes through this path, otherwise the PWA silently loses writes on trains/supermarkets. Use the store's `dispatch` helper (see `lists/[listId]/list-store.svelte.ts`) as the template.

### Form `.enhance` pitfalls

- The browser captures `FormData` **before** the `enhance` callback runs. Mutating the form's DOM inside the callback (e.g. regenerating a hidden `id` input) won't affect the submission. Regenerate such values via reactive `$state` bound with `value={...}` after the submit resolves.
- Keep `enhance` callbacks short — build the override, call `dispatch` (or `submit().updates(override)`), done.

### Service worker caching

- Same-origin GETs use `NetworkFirst` with a 3s timeout (see `vite.config.ts`). Fresh data online, cache fallback on patchy networks. **Do not** switch back to `StaleWhileRevalidate` — it causes post-mutation nav-back to show stale data until a second round trip.
- Remember that `registerType: 'autoUpdate'` means a new SW only takes over on next load. Document any caching change as "requires reload to take effect" in its commit message.

### Checklist for a new mutating route

1. Query exposes data via `getX().current`; no shadowing.
2. `form`/`command` handler calls `void getX().refresh()` at the end.
3. Route-scoped `createXStore(...)` owns `.withOverride` transforms + offline dispatch.
4. Overrides are idempotent.
5. Page component delegates to the store — no manual optimistic state.
6. Writes go through `offlineQueue` when `!offlineQueue.online`.

## Project structure

```
src/
  lib/
    server/     # Server-only code (DB, auth)
    components/ # Shared Svelte components
  routes/       # SvelteKit file-based routes
  styles/       # Global CSS and design tokens
  app.css       # Global styles entry point (imports tokens.css)
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
