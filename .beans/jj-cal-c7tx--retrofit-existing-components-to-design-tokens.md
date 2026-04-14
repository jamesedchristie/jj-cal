---
# jj-cal-c7tx
title: Retrofit existing components to design tokens
status: done
type: chore
created_at: 2026-04-12T12:00:00Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-5iy9
---

Retrofit components that pre-date the design tokens system (`src/styles/tokens.css`) so they comply with the strict styling rules in `CLAUDE.md`. Tracked separately so it doesn't bleed into unrelated PRs.

## Context

`src/styles/tokens.css` was introduced as the single source of truth for all UI styling. New and modified components must use the tokens (no raw hex, no raw px, no magic z-index, etc.). Several existing components were written before this rule and still contain raw values. CLAUDE.md explicitly carves them out from "side-effect retrofits" so future work stays reviewable — they get cleaned up here instead.

## Components needing retrofit

Identified during the token foundation work:

- **`src/lib/components/BottomNav.svelte`** — raw hex (`#e5e7eb`, `#9ca3af`, `#111827`, `#6b7280`), raw px sizes, raw transition duration.
- **`src/lib/components/FAB.svelte`** — raw hex, raw px, raw `rgba()`, magic `z-index: 40` and `50/51`, raw shadow values, raw transitions, raw `0.05em` letter-spacing.
- **`src/lib/components/Button.svelte`** — uses `var(--button-bg-color, black)` style fallbacks where the fallback hardcodes the value. Needs to point at global tokens (`--color-primary` etc.) without hardcoded fallbacks.
- **`src/lib/components/TextInput.svelte`** — same local-fallback pattern as `Button.svelte`. Also has a hardcoded `lightgray` border in the fallback.
- **`src/lib/components/Textarea.svelte`** — likely the same pattern as `TextInput.svelte`. Verify and retrofit.
- **`src/lib/components/NameTag.svelte`** — verify and retrofit.
- **`src/lib/components/toast/Toast.svelte`** — verify and retrofit.
- **`src/routes/+layout.svelte`** — header padding and layout values are raw.
- **Any other route-level `<style>` blocks** — sweep `src/routes/**/*.svelte` for raw values during the retrofit.

## Approach

1. One component per commit (or per small group) so reviews stay manageable.
2. For each component:
   - Replace every raw colour with a `var(--color-*)` token.
   - Replace every raw spacing/font-size/radius/shadow with the matching token.
   - Replace magic z-index numbers with `var(--z-*)`.
   - Replace transition durations/easings with `var(--duration-*)` / `var(--ease-*)`.
   - Drop local-fallback patterns (`var(--button-bg-color, black)`) — point directly at globals.
3. If a needed token doesn't exist, add it to `src/styles/tokens.css` (including a dark-mode counterpart for colours) before using it.
4. Visually verify each component in the dev server (light + dark mode) before moving to the next.

## Acceptance

- `grep` for hex codes in `src/lib/components/**/*.svelte` and `src/routes/**/*.svelte` returns no matches inside `<style>` blocks.
- Same for `rgba(`, `rgb(`, named colours, and magic z-index numbers.
- Light and dark mode both render correctly without visual regressions.

## Out of scope

- Designing the actual brand palette — the tokens currently use safe Tailwind-ish defaults and will be re-themed in a separate pass.
- Adding new component variants or features.
