-- Migration: family member profile fields (jj-cal-aovo)
--
-- Adds display_name and colour to the user table.
-- SQLite supports ADD COLUMN for new nullable columns — no table recreation needed.

ALTER TABLE `user` ADD COLUMN `display_name` text;
ALTER TABLE `user` ADD COLUMN `colour`       text;
