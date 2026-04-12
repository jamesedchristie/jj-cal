# Family Hub — Product Vision

## What is this?

A shared family planning and admin app for couples and households. Started as a shared calendar (jj-cal) and evolving into a full family hub covering calendars, todos, reminders, lists, and budgeting. Designed to feel like a native mobile app via PWA.

## Target users

- Primary: A couple (James + wife) managing day-to-day family life
- Extended: Optionally share with grandparents or others (read-only or limited access)

## Core principles

- **Mobile-first** — designed for the phone you always have in your hand
- **Fast and app-like** — PWA with native feel, bottom nav, smooth transitions
- **Shared by default, personal when needed** — items can be family-wide or personal
- **Low friction** — quick-add for the most common actions, minimal taps to get things done

## Feature areas

### 1. Calendar (existing, enhance)
- Shared family calendar
- Personal calendars overlaid
- Recurring events
- Color-coded by family member
- Event categories/tags

### 2. Todos & Tasks
- Shared and personal todo lists
- Assign tasks to family members
- Due dates, priorities
- Recurring tasks (e.g. "pay rent every month")
- Mark complete with satisfying UX

### 3. Reminders & Notifications
- Set reminders tied to calendar events or standalone
- Push notifications via PWA service worker
- Snooze / dismiss

### 4. Generic Lists
- Shopping lists (real-time collaborative)
- Packing lists (reusable templates)
- Custom named lists (e.g. "Movies to watch", "Restaurants to try")
- Check-off items, reorder, archive

### 5. Meal Planning
- Weekly dinner planner
- Link meals to shopping list auto-population
- Saved meal ideas / rotation

### 6. Simple Budgeting
- Monthly budget categories (groceries, eating out, entertainment, etc.)
- Log expenses against categories
- Running totals and simple over/under view
- No bank integrations — manual entry, kept simple

### 7. Family Profiles & Multi-user
- Each family member has a profile with a color
- Invite system (email link)
- Role-based: admin (full access), member (standard), viewer (read-only for grandparents etc.)

### 8. Quick Reference / Info
- Emergency contacts
- Important numbers (doctor, vet, school, plumber etc.)
- Household info (WiFi password, bin day, etc.)

## UX vision

- Bottom navigation bar (Calendar | Tasks | Lists | Budget)
- Floating action button for quick-add
- Swipe gestures where natural
- Offline-capable (cached reads, queued writes)
- Installable PWA on iOS and Android
- Light/dark mode

## Tech stack

SvelteKit 5, Cloudflare Workers, Drizzle ORM + Turso (libSQL), Temporal for date handling. Deployed to Cloudflare Pages.
