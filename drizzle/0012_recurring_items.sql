-- jj-cal-9ol1: recurring list items
-- Virtual recurrence: a single row per recurring task. An item is treated as
-- incomplete when completedAt is older than its recurrenceInterval (or null).
-- No new rows are spawned on completion — the check happens at query time.

--> statement-breakpoint
ALTER TABLE `list_item` ADD COLUMN `recurrence_interval` text;
