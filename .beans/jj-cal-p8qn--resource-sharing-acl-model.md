---
# jj-cal-p8qn
title: Resource sharing & ACL model
status: done
type: feature
created_at: 2026-04-12T12:00:00Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-6odu
---

Defines the sharing/permission model for user-created resources (calendars, lists, and future shareables like meal plans or budgets). Each resource is owned by its creator and can be shared with individual family members at a chosen permission level. No global "shared with everyone" visibility — access is always explicit.

## Decision: hybrid model

Keep `calendars` and `lists` as separate first-class tables (each with their own type-specific columns and strong foreign keys from their children). Share access through a **single polymorphic `resource_shares` table** keyed on `(resource_type, resource_id, user_id)`.

```
calendars       — id, name, slug, colour, created_by, ...
lists           — id, name, type, created_by, ...
events          — calendar_id → calendars.id
list_items      — list_id → lists.id
resource_shares — resource_type, resource_id, user_id, permission
```

### Why hybrid over fully unified `resources` table

A fully unified `resources` table was considered and rejected. Downsides that drove the decision:

- Type-specific columns (calendar colour, list type, etc.) still need homes, forcing a 1:1 join back to per-type tables — the simplicity win evaporates.
- Child tables (`events`, `list_items`) would become polymorphic too, losing strong FKs on the highest-traffic writes.
- Every query carries a `where type = ?` filter — easy to forget, silent cross-type leakage when you do.
- Drizzle ergonomics suffer: discriminated unions and narrowing everywhere.
- Abstraction only holds while commonality holds; one divergent column and the model unpicks.

### Why still share one `resource_shares` table

- **One ACL implementation.** A single `canUserAccess(type, id, permission)` helper, one `shareResource()` writer, one `listSharedWithUser()` query. This is the real maintainability win.
- **Trivial extensibility.** Adding meal plans or budgets = new table + new enum value in `resource_shares.resource_type`. No new share table, no new ACL code.
- **Polymorphism is contained.** The only weakly-typed join is in `resource_shares` itself — touched through one narrow code path — rather than spread across `events`, `list_items`, and every future child table.

## Schema sketch

```ts
export const resourceSharesTable = sqliteTable('resource_share', {
  id: integer('id').primaryKey(),
  resource_type: text('resource_type', { enum: ['calendar', 'list'] }).notNull(),
  resource_id: integer('resource_id').notNull(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  permission: text('permission', { enum: ['viewer', 'editor'] }).notNull(),
  created_at: integer('created_at').notNull(),
  created_by_id: integer('created_by_id').notNull().references(() => usersTable.id)
}, (t) => ({
  uniq: unique().on(t.resource_type, t.resource_id, t.user_id)
}));
```

Owner of a resource is tracked on the resource table itself (`created_by_id`) and has implicit full access — they do not appear in `resource_shares`.

## Permission levels

- **viewer** — read-only. Sees the resource and its children, cannot create/edit/delete.
- **editor** — read/write. Can create, edit, and delete children (events / list items). Cannot rename, re-share, or delete the resource itself.
- **owner** (implicit, not stored in shares) — full control including rename, re-share, delete.

Admin role (from `jj-cal-ruw8`) is orthogonal to per-resource permissions — admin is an app-wide role for user management only, not for accessing other people's resources.

## Invariants to enforce in app code

Because SQLite cannot express "this `resource_id` points at a row in the table named by `resource_type`", these must be policed at the application layer:

1. All writes to `resource_shares` go through a single `shareResource(type, id, userId, permission)` function that validates the resource exists.
2. All reads go through `canUserAccess(type, id, permission)` — no ad-hoc join-and-filter at call sites.
3. On resource deletion (soft or hard), cascade-delete the matching `resource_shares` rows.

## Out of scope for this bean

- Invite flow (`jj-cal-4rop`) — how a user ends up in the system in the first place.
- Admin role / user management (`jj-cal-ruw8`).
- UI for sharing (share sheet, member picker) — separate bean.
- Migrating existing `todosTable` to be list-scoped — handled by the todo-list-parent follow-up bean.
