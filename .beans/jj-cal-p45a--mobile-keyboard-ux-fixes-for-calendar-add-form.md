---
# jj-cal-p45a
title: Mobile keyboard UX fixes for calendar add form
status: completed
type: feature
priority: normal
created_at: 2026-04-21T22:16:27Z
updated_at: 2026-04-21T22:23:03Z
---

Bottom sheet modal for add form, visualViewport keyboard tracking, hide nav on keyboard, Enter submits, taller buttons

## Summary of Changes

- Add form moved to fixed bottom sheet modal with drag handle, backdrop, slide-up animation
- visualViewport tracks keyboard height; sheet floats above keyboard via bottom offset
- Bottom nav hidden while keyboard is open (layout-level visualViewport listener)  
- Enter key (no modifier needed) submits the add form
- Cancel and Add event buttons taller (space-3 padding)
