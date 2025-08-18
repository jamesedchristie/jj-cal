CREATE TABLE `event` (
	`id` integer PRIMARY KEY NOT NULL,
	`datetime` integer NOT NULL,
	`text` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created_by_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);