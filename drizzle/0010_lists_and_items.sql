-- jj-cal-m3vk: migrate flat todosTable to generic lists model
-- Creates `list` and `list_item` tables, migrates existing todos, drops `todo`.

--> statement-breakpoint
CREATE TABLE `list` (
    `id` text PRIMARY KEY NOT NULL,
    `name` text NOT NULL,
    `type` text NOT NULL DEFAULT 'todo',
    `created_by_id` text NOT NULL,
    `created_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TABLE `list_item` (
    `id` text PRIMARY KEY NOT NULL,
    `list_id` text NOT NULL REFERENCES `list`(`id`) ON DELETE CASCADE,
    `text` text NOT NULL,
    `completed` integer NOT NULL DEFAULT false,
    `completed_at` integer,
    `due_date` text,
    `sort_order` integer NOT NULL DEFAULT 0,
    `created_at` integer NOT NULL,
    `created_by_id` text NOT NULL,
    `assigned_to_id` text
);

--> statement-breakpoint
-- Create one "My tasks" list per user who has todos.
-- ID is deterministic so the JOIN in the next step is a plain string concat.
INSERT INTO `list` (`id`, `name`, `type`, `created_by_id`, `created_at`)
SELECT
    'init-tasks-' || created_by_id,
    'My tasks',
    'todo',
    created_by_id,
    MIN(created_at)
FROM `todo`
GROUP BY created_by_id;

--> statement-breakpoint
-- Copy every todo row into list_item, preserving all fields.
INSERT INTO `list_item` (`id`, `list_id`, `text`, `completed`, `completed_at`, `due_date`, `sort_order`, `created_at`, `created_by_id`, `assigned_to_id`)
SELECT
    CAST(id AS TEXT),
    'init-tasks-' || created_by_id,
    text,
    completed,
    completed_at,
    due_date,
    sort_order,
    created_at,
    created_by_id,
    assignee_id
FROM `todo`;

--> statement-breakpoint
DROP TABLE `todo`;
