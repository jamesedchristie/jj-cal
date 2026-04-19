---
# jj-cal-37wv
title: 'Offline PWA: read cache + write queue'
status: completed
type: feature
priority: normal
created_at: 2026-04-19T06:56:27Z
updated_at: 2026-04-19T06:59:17Z
parent: jj-cal-5iy9
---

Tier 1: app shell + StaleWhileRevalidate GET caching via Workbox. Tier 2: localStorage write queue that replays POST mutations on reconnect. Covers the key offline use case of checking off grocery list items with no signal.

## Summary of Changes

- **vite.config.ts**: Enabled Workbox precaching for all static assets (JS/CSS/images) + runtime caching: NavigationFirst for HTML pages (5s timeout, then cache), StaleWhileRevalidate for same-origin GET requests (covers all RPC query calls)
- **src/lib/offline-queue.svelte.ts**: Reactive singleton class with localStorage-backed write queue. Tracks online state, `enqueue(url, body)` to add a write, `drain()` to replay on reconnect. Auto-wires window online/offline events in browser.
- **src/lib/components/OfflineBanner.svelte**: Persistent warning banner (using warning tokens) that shows when offline, with pending write count.
- **src/routes/+layout.svelte**: Mounts OfflineBanner between header and main.
- **src/routes/lists/[listId]/+page.svelte**: Added offline-aware enhance callbacks to all 3 toggle forms (incomplete, recently-completed, archived) and the add-item form. On network failure while offline: queues the write to localStorage, shows 'Queued — will sync when reconnected' toast. On reconnect the drain() replays all queued POSTs to the server.
