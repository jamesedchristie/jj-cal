---
# jj-cal-z3nb
title: Shared vs personal events
status: closed
type: feature
created_at: 2026-04-12T06:20:04Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-ge1v
---

Events can be family-wide (visible to all) or personal (visible only to the creator).

## Closed — subsumed by per-resource ACL

This bean is redundant under the resource-sharing model decided in `jj-cal-p8qn`. Visibility is no longer a property of an individual event — it's a property of the **calendar** the event lives in. A "personal" event is just an event in a calendar that has not been shared with anyone else. A "family-wide" event is just an event in a calendar shared with the whole family.

No new code or schema is needed for this — falls out of `jj-cal-p8qn` (resource sharing) automatically.

If we later want a "default visibility on event creation" UX nicety (e.g. a quick toggle for "post this to my private calendar instead"), that can live in a separate, much smaller bean about the event-creation flow.
