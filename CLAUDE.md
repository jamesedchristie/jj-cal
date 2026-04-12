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
| Styles | Plain CSS in Svelte `<style>` blocks, driven by design tokens in `src/styles/tokens.css` |
| Package manager | pnpm |
| Deployment | Cloudflare Pages |

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

| Property | Token |
|---|---|
| Colours | `var(--color-*)` |
| Spacing (padding, margin, gap) | `var(--space-*)` |
| Font family | `var(--font-body)`, `var(--font-heading)`, `var(--font-mono)` |
| Font size | `var(--font-size-*)` |
| Font weight | `var(--font-weight-*)` |
| Line height | `var(--line-height-*)` |
| Letter spacing | `var(--letter-spacing-*)` |
| Border radius | `var(--radius-*)` |
| Shadow | `var(--shadow-*)` |
| Transition duration | `var(--duration-*)` |
| Transition easing | `var(--ease-*)` |
| Z-index | `var(--z-*)` |
| Safe area insets | `var(--safe-top/bottom/left/right)` |
| Max content width | `var(--layout-max-width)` |
| Page gutter | `var(--layout-gutter)` |

### Allowed raw values (exceptions)

- `0`, `100%`, `auto`, `none`, `inherit`, `currentColor`, `transparent`
- Fractional grid units (`1fr`, `minmax(...)`)
- Border widths in pixels (`1px`, `2px`) — no token yet; add one if the set grows
- `env(safe-area-inset-*)` directly is discouraged — prefer `var(--safe-*)`

### Adding new tokens

If you need a value that doesn't have a token, **add one to `src/styles/tokens.css`** in the correct section, then use it. Do not inline the raw value. When adding a colour token, you MUST also add its counterpart in the `@media (prefers-color-scheme: dark)` block at the bottom of the same file.

### Retrofitting existing components

Some existing components (e.g. `BottomNav.svelte`, `FAB.svelte`) still contain raw values from before this rule. Do not retrofit them as a side effect of other work — retrofits are tracked as their own beans. New or modified components must follow the rules above.

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
