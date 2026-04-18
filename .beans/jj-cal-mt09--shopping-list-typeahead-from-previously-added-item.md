---
# jj-cal-mt09
title: 'Shopping list: typeahead from previously added items'
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:27Z
updated_at: 2026-04-18T11:21:43Z
parent: jj-cal-o6bu
---

For shopping lists, remember items previously added to that specific list and offer typeahead / suggestions when the user starts typing a new item. Makes repeat shops much faster.

## Summary of Changes\n\nAdded shopping list typeahead:  state bound to add input,  derived state filters  by prefix match (shopping lists only, max 5), suggestions UI renders below  as a list of buttons that fill-and-submit on mousedown (preserving focus). CSS uses design tokens throughout.
