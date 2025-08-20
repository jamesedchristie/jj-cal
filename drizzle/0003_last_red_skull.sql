CREATE TABLE `calendar` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created_by_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_name_unique` ON `calendar` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_slug_unique` ON `calendar` (`slug`);--> statement-breakpoint
ALTER TABLE `event` ADD `calendar_id` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `calendar_slug` text NOT NULL;