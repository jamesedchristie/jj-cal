---
# jj-cal-60nw
title: Quick-add floating action button
status: completed
type: feature
created_at: 2026-04-12T06:20:14Z
updated_at: 2026-04-12T06:20:14Z
parent: jj-cal-5iy9
---

FAB that opens a contextual quick-add sheet based on current section. Minimal taps to create the most common things.

## Summary of Changes

Added `FAB.svelte` component with a fixed-position circular "+" button that appears above the bottom nav on the /tasks section. Tapping opens a slide-up bottom sheet (with backdrop + handle) containing an auto-focused text input wired to the existing `addTodo` remote form. Sheet dismisses on backdrop tap or after successful submission. Uses Svelte `fly`/`fade` transitions. Safe-area insets handled for mobile. Integrated into root layout alongside BottomNav. Section detection via `$app/state` page pathname — easily extensible to Lists, Budget etc.
