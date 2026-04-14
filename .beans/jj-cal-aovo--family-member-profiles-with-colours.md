---
# jj-cal-aovo
title: Family member profiles with colours
status: todo
type: feature
created_at: 2026-04-12T06:19:59Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-6odu
---

Each user has a display name, avatar/initials, and a colour used throughout the app to identify them (event creators, todo assignees, comment authors, etc.).

## Decisions

- **Profiles are always backed by a real user account.** No "ghost" profiles for non-logged-in family members (e.g. children too young to log in). This keeps the data model simple — a profile *is* a user. If we later want to model children, that's a separate bean.
- **Fields live on the users table**, added as columns: `display_name`, `colour`, optional `avatar_url` (or initials-only for v1).
- **Colour pool**: a fixed palette of family-friendly colours defined as tokens in `src/styles/tokens.css` (e.g. `--color-family-1` through `--color-family-8`). Users pick from the palette at signup and can change later. New colour tokens added here must follow the styling rules in `CLAUDE.md`.
- **Colour collisions**: not prevented — two users can share a colour if they want. The pool is large enough that they usually won't.

## Out of scope

- Avatar uploads (just initials + colour for v1)
- Modelling non-user family members (children, pets) — separate bean if needed
