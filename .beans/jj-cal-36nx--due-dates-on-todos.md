---
# jj-cal-36nx
title: Due dates on todos
status: completed
type: feature
created_at: 2026-04-12T06:20:09Z
updated_at: 2026-04-12T06:20:09Z
parent: jj-cal-63vm
---

Optional due date on todos. Overdue items highlighted. Option to show on calendar.

## Summary of Changes

Added `due_date` (text, YYYY-MM-DD) column to the todos table via migration 0005. Schema, createTodo query, and addTodo remote form updated to accept an optional due date. Tasks page add form gains a calendar-icon date row below the text input. Todo list items show a colour-coded chip: red for overdue, amber for today, grey for upcoming. Due date comparison uses Sydney timezone via Intl.DateTimeFormat.
