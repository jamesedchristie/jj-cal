---
# jj-cal-5bp1
title: Offline support (cached reads)
status: draft
type: feature
priority: normal
created_at: 2026-04-12T06:20:14Z
updated_at: 2026-04-18T06:31:06Z
parent: jj-cal-5iy9
---

Service worker caches key pages and data. Reads work offline. Writes queue and sync when back online.

Context: app is noticeably sluggish on poor connections (e.g. supermarket). This makes it critical for real-world daily use, not just a nice-to-have offline feature.
