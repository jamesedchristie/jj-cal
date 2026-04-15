---
# jj-cal-o6bu
title: Generic Lists
status: in-progress
type: epic
created_at: 2026-04-12T06:19:49Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-qkdt
---

Shopping lists, packing lists, custom named lists, and todo lists — all unified under a single "list" concept. Lists are shared per-resource via the ACL model in `jj-cal-p8qn`. Items can be checked off, reordered, and (later) loaded from reusable templates.

## Scope change (moved from V2 → V1)

Originally scoped under `jj-cal-wpfq` (V2 — Lists & Reminders). **Pulled forward into V1** (`jj-cal-qkdt`) because the multi-user / per-resource sharing work in V1 requires todos to live inside a parent list rather than as a flat global table. Once we're building "lists" as the parent for todos, "shopping list" and "packing list" are the same concept — just a list with a different intent — so it makes sense to ship them together rather than build the same thing twice.

## Unification with todos

- **Single `lists` table** with a `type` column (`todo`, `shopping`, `packing`, `custom`).
- **Single `list_items` table** with `list_id`, `text`, `completed`, `due_date`, `sort_order`, `created_by_id`, `assigned_to_id` (nullable), etc.
- The existing flat `todosTable` (from `jj-cal-1amp`) gets migrated under this new model — see the migration follow-up bean.
- List type drives UI affordances (todo lists show due-date chips and assignment; shopping lists hide due dates; packing lists allow templates) but the underlying data shape is the same.

## Out of scope for this epic

- Reusable templates (defer to V2 — that's the part that genuinely needs more thought)
- Real-time collaborative editing (defer — eventual goal, not v1)
- Linking shopping items to meal plans (`jj-cal-gr8i`)
