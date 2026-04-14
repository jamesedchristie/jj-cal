CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_unique` ON `invite` (`token`);
