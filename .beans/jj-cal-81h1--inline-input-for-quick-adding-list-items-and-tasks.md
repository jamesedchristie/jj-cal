---
# jj-cal-81h1
title: Inline input for quick-adding list items and tasks
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:21Z
updated_at: 2026-04-18T06:46:56Z
parent: jj-cal-o6bu
---

Add an input field directly beneath the last item in a list or task group, so users can quickly add new items without tapping a separate button. Should feel fast and mobile-friendly.

## Summary of Changes\n\n- Removed the top trigger-button pattern from both /lists/[listId] and /tasks\n- Add form now lives permanently at the bottom of each page, always visible\n- After submitting, the input clears and refocuses — no extra tap needed to add the next item\n- Metadata (assignee, due date, recurrence) hidden behind a ⋯ toggle; collapsed by default for fast path\n- Shopping lists now have an add input too (previously excluded)
