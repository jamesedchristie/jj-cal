---
# jj-cal-m3vk
title: Migrate todos under list parent
status: todo
type: feature
created_at: 2026-04-12T12:00:00Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-o6bu
---

Follow-up to `jj-cal-1amp` (which shipped a flat `todosTable` with no parent). Migrate todos to live inside a parent list, as decided in the unified-lists scope of `jj-cal-o6bu`.

## Background

The original todo work in `jj-cal-1amp` created a single `todosTable` with no `list_id`. At the time there was no "list" concept. Now that lists are first-class (parent for both todos and shopping/packing/custom lists), todos need to belong to a list — which is also the unit of sharing per `jj-cal-p8qn`.

## Work

### Schema

- Create the new `lists` table: `id`, `name`, `type` (enum: `todo`, `shopping`, `packing`, `custom`), `created_by_id`, `created_at`.
- Create `list_items` table: `id`, `list_id` (FK → lists), `text`, `completed`, `completed_at`, `due_date`, `sort_order`, `created_at`, `created_by_id`, `assigned_to_id` (nullable, FK → users).
- Drop `todosTable` after migration.

### Data migration

Existing todos must not be lost. Migration steps:

1. Create the new `lists` and `list_items` tables.
2. Create a single seed list per user — name `"My tasks"`, `type = 'todo'`, `created_by_id = <existing creator>`. (Or one global "Tasks" list if simpler — decide during implementation.)
3. Copy each row from `todosTable` into `list_items`, mapping `list_id` to the appropriate seed list based on `created_by_id`.
4. Drop `todosTable`.

### Code changes

- Update Drizzle schema (`src/lib/server/db/schema.ts`).
- Replace `getAllTodos` / `createTodo` / `setTodoCompleted` / `deleteTodo` queries with list-scoped equivalents.
- Update remote functions in `src/routes/tasks/data.remote.ts` (or wherever they live) to take a `listId`.
- Update the tasks UI to either pick a list or default to a single "primary" list per user for v1.
- Update FAB quick-add to know which list it's adding to.

### ACL

Each list gets sharing via `resource_shares` (from `jj-cal-p8qn`). Migration creates lists owned by the original creator with no shares, so the migration is access-preserving (only the creator could see their todos before, only the creator can see them after).

## Out of scope

- The full sharing UI (separate bean)
- Generic list types beyond `todo` (shopping, packing — covered by `jj-cal-o6bu`'s main implementation, may overlap with this bean)
- Reusable templates (deferred)
