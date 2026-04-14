/**
 * Legacy login form handler — REPLACED by better-auth.
 *
 * Sign-in is now handled at /api/auth/sign-in/username (POST JSON).
 * The login UI at +page.svelte needs updating to call that endpoint.
 * This file is kept as a placeholder until the UI is wired up.
 *
 * TODO (jj-cal-ruw8): Remove this file and update +page.svelte to POST
 * to /api/auth/sign-in/username with { username, password } JSON body.
 */
export {};
