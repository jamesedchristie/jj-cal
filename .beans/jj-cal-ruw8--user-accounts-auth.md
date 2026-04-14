---
# jj-cal-ruw8
title: User accounts & auth
status: draft
type: feature
created_at: 2026-04-12T06:19:59Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-6odu
---

Sign up / sign in. Currently auth may be implicit — make it proper multi-user.

## Decisions

These decisions were made during planning and lock in the shape of the auth system before implementation begins.

### Login method

**Username + password**, stored hashed in the users table. No OAuth, no passkeys (for now — can be added later).

### Account recovery

**No email sending capability**, so no self-service password reset. Lost passwords are reset **by the admin** via a user-management screen. This means:

- There must always be at least one admin in the system (enforced at the app layer — cannot remove admin role from the last admin).
- Non-admins who forget their password ask an admin to reset it.
- The single-admin edge case is acceptable for a family hub.

### First-user bootstrap

**Seed via environment variable**. On first boot with no users, the app creates a user from env vars (e.g. `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD_HASH` or similar) and marks them as admin. Once any user exists, the seed env vars are ignored.

### Session length & storage

- **Rolling sessions** — refresh expiry on every authenticated request.
- **Hard cap**: 1 year of inactivity before forced re-auth.
- No forced re-auth otherwise — users should be able to install the PWA and treat it like a native app.
- **Multi-device**: one user can have multiple concurrent sessions (phone, laptop, tablet).
- **Session storage**: DB-backed (Drizzle/libSQL) — required for Cloudflare Workers edge runtime (no in-memory sessions).

### Roles

Single app-wide role: **admin** or **not**. Admin can:

- Invite new users (via share link — see `jj-cal-4rop`)
- Remove users (soft-delete — their created resources are preserved, marked as ex-member)
- Reset other users' passwords

Admin is **orthogonal to per-resource permissions**, which are defined separately in `jj-cal-p8qn` (viewer/editor on individual calendars, lists, etc.).

### Deletion semantics

Soft-delete. A deleted user:

- Cannot log in
- No longer appears in assignee pickers
- Their created resources (calendars, lists, events, list items) remain, tagged as "created by ex-member"
- Their entries in `resource_shares` are removed so their session would not have access if somehow revived

## Library choice

**Leading candidate: [better-auth](https://better-auth.com)**. Reasoning:

- First-class SvelteKit + Drizzle + libSQL support
- Runs on Cloudflare Workers
- Organization plugin maps closely onto the family/admin concept (though we only need the subset — single family, one elevated role)
- Plugin-based, so passkeys / OAuth can be added later without rewriting
- User table is our Drizzle schema, so adding `color`, `displayName`, `avatar` for `jj-cal-aovo` is a trivial column addition

**Caveats to verify before committing:**
- Relatively young library — API churn risk. Pin the version.
- Workers-compatible session storage must be DB-backed, not in-memory.
- Better-auth uses `Date` internally; we use Temporal everywhere else. Need a thin boundary-layer conversion.
- Wrap better-auth imports behind a thin internal module so the rest of the codebase never imports it directly. This gives us an escape hatch if the library becomes painful.

**Alternative considered**: rolling our own session-cookie auth with Drizzle. Viable (the family-scale dataset is small), but we'd lose the invite / role plumbing and have to write it ourselves. Rejected unless better-auth proves difficult on Workers.

Final call on library is pending a short spike — verify that better-auth works cleanly on Cloudflare Workers with our Drizzle/libSQL setup, and that the org plugin can be constrained to single-family semantics without fighting the library.

## Out of scope for this bean

- Invite flow itself — `jj-cal-4rop`
- Family member profile fields (display name, colour) — `jj-cal-aovo`
- Per-resource permissions (viewer/editor) — `jj-cal-p8qn`
- UI for user management (admin screen) — separate bean when we get there
