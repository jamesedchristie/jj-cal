---
# jj-cal-b6z3
title: Auto-archive completed items after ~1 day
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:25Z
updated_at: 2026-04-18T11:06:52Z
parent: jj-cal-63vm
---

Recently completed items should appear briefly in a 'Completed' section at the bottom, then automatically move to an archive after ~24 hours. The archive should be accessible but out of the way.

## Summary of Changes\n\nPure client-side split using completedAt timestamp — no schema changes needed. Items completed within the last 24h show in the existing 'N completed' section. Older items move to a separate 'N archived' details block below it, styled slightly smaller/dimmer to stay out of the way. Both sections allow uncompleting or deleting items.
