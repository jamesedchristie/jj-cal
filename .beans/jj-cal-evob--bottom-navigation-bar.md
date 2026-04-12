---
# jj-cal-evob
title: Bottom navigation bar
status: completed
type: feature
priority: normal
created_at: 2026-04-12T06:20:14Z
updated_at: 2026-04-12T06:57:08Z
parent: jj-cal-5iy9
---

Replace or supplement top nav with a mobile-native bottom nav: Calendar, Tasks, Lists, Budget. Active state, safe area insets.

## Summary of Changes

Added BottomNav.svelte with Calendar/Tasks/Lists/Budget tabs. Uses page from app/state for active detection, resolve() for hrefs, inline SVGs. Integrated into root layout as flex sibling to main. Created stub routes for /tasks, /lists, /budget. Safe area insets via CSS env().
