---
# jj-cal-y292
title: Font size accessibility toggle (larger text mode)
status: completed
type: feature
priority: normal
created_at: 2026-04-18T06:29:24Z
updated_at: 2026-04-18T11:16:42Z
parent: jj-cal-5iy9
---

Add a setting to bump up the app's base font size for low-vision situations (e.g. forgotten glasses). Should persist across sessions and apply globally via a CSS class or token override.

## Summary of Changes\n\n- Inline script in app.html applies large-text class before first paint (no flash)\n- html.large-text { font-size: 120% } in app.css scales all rem-based tokens globally\n- Toggle switch on profile page with localStorage persistence\n-  syncs the class to document.documentElement on change
