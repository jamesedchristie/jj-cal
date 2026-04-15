-- jj-cal-p8qn: resource sharing & ACL model
-- Single polymorphic table for sharing lists (and future: calendars) between
-- family members. Owner access is implicit via createdById on the resource;
-- this table only records non-owner grants.

--> statement-breakpoint
CREATE TABLE `resource_share` (
    `id` text PRIMARY KEY NOT NULL,
    `resource_type` text NOT NULL,
    `resource_id` text NOT NULL,
    `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
    `permission` text NOT NULL,
    `created_at` integer NOT NULL,
    `created_by_id` text NOT NULL REFERENCES `user`(`id`)
);

--> statement-breakpoint
-- One permission level per (resource, user) pair.
CREATE UNIQUE INDEX `rs_resource_user_uniq`
ON `resource_share` (`resource_type`, `resource_id`, `user_id`);
