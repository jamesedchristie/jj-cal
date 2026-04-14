---
# jj-cal-4rop
title: Invite system
status: done
type: feature
created_at: 2026-04-12T06:19:59Z
updated_at: 2026-04-12T12:00:00Z
parent: jj-cal-6odu
---

Mechanism for onboarding new family members into the hub. No email sending — invites are shared out-of-band (WhatsApp, iMessage, in person).

## Decisions

### Invite shape

- **Admin generates an invite** from a user-management screen. No email is sent; the admin is shown a shareable **link** and a **QR code** they can hand off however they like.
- **Multi-use, generic**: one invite link can be used by multiple people (so the admin doesn't need to generate per-person links). Pre-filling a specific name is not required.
- **Expiring**: each invite has a time expiry (e.g. 7 days). The admin can generate a new link whenever they want.
- **QR code**: the same link rendered as a QR code on the screen, so in-person onboarding is "point your phone at this".

### Invite table sketch

```
invites — id, token, created_by_id, created_at, expires_at, revoked_at?
```

When a user visits the invite URL:

1. Token is validated (exists, not expired, not revoked).
2. User is shown a sign-up form (username, password, display name, colour pick).
3. On submission, a new non-admin user is created, session is started, they land in the app.
4. The invite is **not** consumed — it remains valid for other users until expiry or manual revocation.

### Revocation

Admin can revoke any invite before expiry (sets `revoked_at`). Revoked invites return an error at the URL.

### Roles

All invited users are created as non-admin. Promoting someone to admin is a separate action from the admin user-management screen. This keeps the invite flow simple.

## Out of scope

- Email delivery of invites (explicitly rejected — no email sending capability)
- Per-resource sharing (covered by `jj-cal-p8qn`)
- Promoting/demoting admin role — belongs in user-management UI bean
