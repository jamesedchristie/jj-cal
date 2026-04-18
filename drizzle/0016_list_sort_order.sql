-- jj-cal-64zt: add sort_order to list table so lists can be reordered

--> statement-breakpoint
ALTER TABLE `list` ADD COLUMN `sort_order` integer NOT NULL DEFAULT 0;
