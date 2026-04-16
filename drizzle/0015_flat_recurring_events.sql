-- Rework recurring events to use a flat model: every occurrence is its own row,
-- linked by a shared recurrence_group_id UUID. The old exception-based approach
-- (base event + event_exception table) is removed.
--
-- NOTE: Existing recurring base events (recurrence_rule IS NOT NULL) cannot be
-- safely expanded in SQL and are deleted. Re-create any recurring events after
-- deploying this migration.

DELETE FROM `event` WHERE `recurrence_rule` IS NOT NULL;

DROP TABLE `event_exception`;

ALTER TABLE `event` ADD `recurrence_group_id` text;
