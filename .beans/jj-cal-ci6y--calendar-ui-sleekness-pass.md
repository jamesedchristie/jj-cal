---
# jj-cal-ci6y
title: Calendar UI sleekness pass
status: completed
type: feature
priority: normal
created_at: 2026-04-21T21:29:56Z
updated_at: 2026-04-21T21:55:08Z
---

UI polish: filter chips top-right overlay, smaller bottom panel, inline event rows with 3-dot menu, collapsed add form that slides up

## Summary of Changes

- Filter chips moved to absolute top-right overlay over month headings
- Bottom panel reduced to 38% of split area
- Event rows refactored to inline: [chip] [text input] [⋯ menu]
- 3-dot menu with delete options (single or delete-this/delete-future for recurring)
- Add form collapsed by default; slides up on click with 2-row layout (name, then selects + actions)
- Add event button: black/white, radius-sm, bottom-right aligned
- Calendar preselected when form opens
