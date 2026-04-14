-- Migration: auth schema overhaul (jj-cal-ruw8)
--
-- Changes:
--  1. Recreate `user` table with better-auth schema (text UUID primary key,
--     email, emailVerified, image, timestamps, username, isAdmin, deletedAt).
--     Existing users are migrated: id cast to text, synthetic email assigned.
--  2. Create `session`, `account`, `verification` tables.
--  3. Recreate `calendar`, `event`, `todo` tables to change
--     created_by_id from integer to text. Existing values are cast.
--
-- SQLite cannot ALTER COLUMN types, so table-recreation is required.
-- All steps use a new_<table> → rename pattern for safety.
---------------------------------------------------------------------------

---------------------------------------------------------------------------
-- 1. Recreate `user` table
---------------------------------------------------------------------------
CREATE TABLE `user_new` (
  `id`               text    PRIMARY KEY NOT NULL,
  `name`             text    NOT NULL,
  `email`            text    NOT NULL,
  `email_verified`   integer NOT NULL DEFAULT false,
  `image`            text,
  `created_at`       integer NOT NULL,
  `updated_at`       integer NOT NULL,
  `username`         text,
  `display_username` text,
  `is_admin`         integer NOT NULL DEFAULT false,
  `deleted_at`       integer
);

-- Migrate existing users.
--   id         → CAST to text
--   email      → synthetic "<name>@family.local"
--   username   → LOWER(name)
--   timestamps → 0 (epoch) — will be overwritten on next session
INSERT INTO `user_new`
  (id, name, email, email_verified, created_at, updated_at, username, is_admin)
SELECT
  CAST(id AS TEXT),
  name,
  LOWER(name) || '@family.local',
  0,
  0,
  0,
  LOWER(name),
  0
FROM `user`;

DROP TABLE `user`;
ALTER TABLE `user_new` RENAME TO `user`;

CREATE UNIQUE INDEX `user_email_unique`    ON `user` (`email`);
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);

---------------------------------------------------------------------------
-- 2. Create `session` table
---------------------------------------------------------------------------
CREATE TABLE `session` (
  `id`          text    PRIMARY KEY NOT NULL,
  `user_id`     text    NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `expires_at`  integer NOT NULL,
  `token`       text    NOT NULL,
  `created_at`  integer NOT NULL,
  `updated_at`  integer NOT NULL,
  `ip_address`  text,
  `user_agent`  text
);

CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);

---------------------------------------------------------------------------
-- 3. Create `account` table
---------------------------------------------------------------------------
CREATE TABLE `account` (
  `id`           text    PRIMARY KEY NOT NULL,
  `user_id`      text    NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `account_id`   text    NOT NULL,
  `provider_id`  text    NOT NULL,
  `access_token`  text,
  `refresh_token` text,
  `id_token`      text,
  `expires_at`    integer,
  `password`      text,
  `created_at`    integer NOT NULL,
  `updated_at`    integer NOT NULL
);

---------------------------------------------------------------------------
-- 4. Create `verification` table
---------------------------------------------------------------------------
CREATE TABLE `verification` (
  `id`          text    PRIMARY KEY NOT NULL,
  `identifier`  text    NOT NULL,
  `value`       text    NOT NULL,
  `expires_at`  integer NOT NULL,
  `created_at`  integer,
  `updated_at`  integer
);

---------------------------------------------------------------------------
-- 5. Recreate `calendar` table (created_by_id integer → text)
---------------------------------------------------------------------------
CREATE TABLE `calendar_new` (
  `id`              integer PRIMARY KEY NOT NULL,
  `name`            text    NOT NULL,
  `slug`            text    NOT NULL,
  `created_by_name` text    NOT NULL,
  `created_by_id`   text    NOT NULL
);

INSERT INTO `calendar_new`
SELECT id, name, slug, created_by_name, CAST(created_by_id AS TEXT)
FROM `calendar`;

DROP TABLE `calendar`;
ALTER TABLE `calendar_new` RENAME TO `calendar`;

CREATE UNIQUE INDEX `calendar_name_unique` ON `calendar` (`name`);
CREATE UNIQUE INDEX `calendar_slug_unique` ON `calendar` (`slug`);

---------------------------------------------------------------------------
-- 6. Recreate `event` table (created_by_id integer → text)
---------------------------------------------------------------------------
CREATE TABLE `event_new` (
  `id`              integer PRIMARY KEY NOT NULL,
  `calendar_id`     integer NOT NULL,
  `calendar_slug`   text    NOT NULL,
  `datetime`        integer NOT NULL,
  `text`            text    NOT NULL,
  `created_by_name` text    NOT NULL,
  `created_by_id`   text    NOT NULL
);

INSERT INTO `event_new`
SELECT id, calendar_id, calendar_slug, datetime, text, created_by_name,
       CAST(created_by_id AS TEXT)
FROM `event`;

DROP TABLE `event`;
ALTER TABLE `event_new` RENAME TO `event`;

---------------------------------------------------------------------------
-- 7. Recreate `todo` table (created_by_id integer → text)
--    (todo was added via manually-applied SQL outside the drizzle journal;
--     this migration now brings it under journal management.)
---------------------------------------------------------------------------
CREATE TABLE `todo_new` (
  `id`              integer PRIMARY KEY NOT NULL,
  `text`            text    NOT NULL,
  `completed`       integer NOT NULL DEFAULT false,
  `completed_at`    integer,
  `due_date`        text,
  `sort_order`      integer NOT NULL DEFAULT 0,
  `created_at`      integer NOT NULL,
  `created_by_name` text    NOT NULL,
  `created_by_id`   text    NOT NULL
);

INSERT INTO `todo_new`
SELECT id, text, completed, completed_at, due_date, sort_order, created_at,
       created_by_name, CAST(created_by_id AS TEXT)
FROM `todo`;

DROP TABLE `todo`;
ALTER TABLE `todo_new` RENAME TO `todo`;
