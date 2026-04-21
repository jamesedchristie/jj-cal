-- Budgeting feature: budget plan items (incomings, outgoings, allocations,
-- savings targets) and a dated expense log tagged to allocation categories.
-- Amounts are stored in cents (integer) to avoid floating-point issues.

--> statement-breakpoint
CREATE TABLE `budget` (
    `id` text PRIMARY KEY NOT NULL,
    `name` text NOT NULL,
    `created_by_id` text NOT NULL REFERENCES `user`(`id`),
    `created_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TABLE `budget_item` (
    `id` text PRIMARY KEY NOT NULL,
    `budget_id` text NOT NULL REFERENCES `budget`(`id`) ON DELETE CASCADE,
    `name` text NOT NULL,
    `type` text NOT NULL,
    `amount` integer NOT NULL,
    `frequency` text NOT NULL,
    `sort_order` integer NOT NULL DEFAULT 0,
    `created_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TABLE `expense` (
    `id` text PRIMARY KEY NOT NULL,
    `budget_id` text NOT NULL REFERENCES `budget`(`id`) ON DELETE CASCADE,
    `amount` integer NOT NULL,
    `description` text NOT NULL,
    `date` text NOT NULL,
    `category_id` text REFERENCES `budget_item`(`id`) ON DELETE SET NULL,
    `created_by_id` text NOT NULL REFERENCES `user`(`id`),
    `created_at` integer NOT NULL
);
