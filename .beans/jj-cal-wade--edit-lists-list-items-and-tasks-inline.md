---
# jj-cal-wade
title: Edit lists, list items, and tasks inline
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:22Z
updated_at: 2026-04-18T11:00:25Z
parent: jj-cal-o6bu
---

Allow users to edit the title/content of lists, list items, and tasks after creation. Inline editing preferred over modal.

## Summary of Changes\n\n- Added updateListItemText and updateListName DB queries\n- Added editItem RPC form to lists/[listId] and tasks data.remote files\n- Added renameList RPC form to lists/[listId] data.remote\n- Tap any item text to edit inline; Enter or blur-with-changes saves, Escape cancels\n- Pencil icon appears on hover/focus in the list header to rename the list\n- Rename input matches heading typography and saves on blur or Escape cancels
