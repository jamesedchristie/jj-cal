/**
 * Thin wrapper around better-auth.
 *
 * Nothing outside this module should import from 'better-auth' directly.
 * This gives us an escape hatch if the library becomes painful to maintain.
 *
 * createAuth() accepts a Drizzle client so it works in both Workers (D1) and
 * local dev (libSQL). Call it once per request from hooks.server.ts.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import type { DrizzleClient } from './db';
import { accountsTable, sessionsTable, usersTable, verificationsTable } from './db/schema';

export function createAuth(db: DrizzleClient) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			// Map better-auth model names → our Drizzle table objects.
			// better-auth looks up schema['user'], schema['session'], etc.
			schema: {
				user: usersTable,
				session: sessionsTable,
				account: accountsTable,
				verification: verificationsTable
			}
		}),

		plugins: [
			username({
				minUsernameLength: 2,
				maxUsernameLength: 50
			})
		],

		// Email/password is the credential mechanism; the username plugin
		// overrides the sign-in path to accept username instead of email.
		emailAndPassword: {
			enabled: true,
			// No email verification — we have no email transport.
			requireEmailVerification: false,
			autoSignIn: true
		},

		// Declare app-level custom fields so better-auth includes them in the
		// session user object and validates them on create/update.
		user: {
			additionalFields: {
				isAdmin: {
					type: 'boolean',
					required: false,
					defaultValue: false,
					input: false // not settable by the user themselves
				},
				deletedAt: {
					type: 'date',
					required: false,
					input: false
				},
				// jj-cal-aovo: profile fields
				displayName: {
					type: 'string',
					required: false,
					input: true
				},
				colour: {
					// CSS variable suffix, e.g. "family-3" → var(--color-family-3)
					type: 'string',
					required: false,
					input: true
				}
			}
		},

		session: {
			// Rolling sessions: 1 year hard cap, refresh window 24 h.
			expiresIn: 60 * 60 * 24 * 365,
			updateAge: 60 * 60 * 24,
			// No in-memory cookie cache — Workers have no persistent process state.
			cookieCache: { enabled: false }
		}
	});
}

export type Auth = ReturnType<typeof createAuth>;
