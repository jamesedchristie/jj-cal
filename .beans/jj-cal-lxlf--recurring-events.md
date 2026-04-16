---
# jj-cal-lxlf
title: Recurring events
status: completed
type: feature
priority: normal
created_at: 2026-04-12T06:20:04Z
updated_at: 2026-04-16T22:05:20Z
parent: jj-cal-ge1v
---

Rework: flat model (each occurrence is its own DB row, linked by recurrence_group_id). Delete single / delete future replaces delete single / delete all.

## Tasks
- [x] Migration: add recurrence_group_id, delete old recurring base events, drop event_exception
- [x] schema.ts: swap to recurrenceGroupId, drop recurrenceRule/recurrenceEndsOn/eventExceptionsTable
- [x] queries.ts: simplify getEventsForMonthAllCalendars, update createEvent to expand occurrences, add deleteFutureEvents
- [x] data.remote.ts: update addEventToDate, add removeFutureEvents, drop cancelOccurrence/overrideOccurrenceText
- [x] events.svelte.ts: swap baseEventId/originalDatetime for recurrenceGroupId
- [x] +page.svelte: update edit/delete handlers and buttons

## Summary of Changes

Replaced the exception-based recurring events model with a flat one. Each occurrence is now its own `event` row linked by a shared `recurrence_group_id` UUID. Removed `event_exception` table, `recurrence_rule`, and `recurrence_ends_on` columns. During creation, all occurrences are expanded upfront (capped at 500 or 2 years). UI buttons changed from "Cancel this date" / "Delete all" to "Delete this" / "Delete future". Editing any occurrence now just edits that row directly.
