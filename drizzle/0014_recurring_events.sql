ALTER TABLE `event` ADD `recurrence_rule` text;
ALTER TABLE `event` ADD `recurrence_ends_on` text;

CREATE TABLE `event_exception` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` integer NOT NULL REFERENCES `event`(`id`) ON DELETE CASCADE,
	`original_datetime` integer NOT NULL,
	`is_cancelled` integer NOT NULL DEFAULT 0,
	`override_text` text
);
