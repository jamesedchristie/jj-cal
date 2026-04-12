CREATE TABLE `todo` (
	`id` integer PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer NOT NULL DEFAULT false,
	`completed_at` integer,
	`sort_order` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL,
	`created_by_name` text NOT NULL,
	`created_by_id` integer NOT NULL
);
