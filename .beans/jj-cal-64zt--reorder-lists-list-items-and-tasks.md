---
# jj-cal-64zt
title: Reorder lists, list items, and tasks
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:21Z
updated_at: 2026-04-18T12:00:55Z
parent: jj-cal-o6bu
---

Allow drag-to-reorder (or equivalent touch gesture) for lists, items within a list, and tasks. Should work well on mobile.

## Summary of Changes\n\nAdded drag-to-reorder for lists, list items, and tasks using SortableJS (touch-friendly, 100ms delay on touch). Grip handles appear on hover/focus. Hidden form pattern submits reordered IDs to server. DB migration adds sort_order to list table. All three surfaces (lists page, list detail, tasks page) support reordering.
