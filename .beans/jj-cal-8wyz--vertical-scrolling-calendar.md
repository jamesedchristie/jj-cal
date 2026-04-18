---
# jj-cal-8wyz
title: Vertical scrolling calendar
status: completed
type: feature
priority: normal
created_at: 2026-04-18T12:17:33Z
updated_at: 2026-04-18T12:24:06Z
parent: jj-cal-o6bu
---

Replace left/right month navigation with a vertically scrollable calendar. Sticky month headers, back-to-today button, default range 2 months prior + 12 months future, lazy-load events with IntersectionObserver.

## Summary of Changes\n\nReplaced left/right month navigation with vertically scrollable calendar. New MonthGrid.svelte component lazy-loads events via IntersectionObserver (400px root margin for pre-loading). 14 months rendered (2 prior + 12 forward). Sticky month name headings. Back-to-today FAB appears when current month scrolls out of view. Mutations now derive year/month from selectedDate rather than URL params.
