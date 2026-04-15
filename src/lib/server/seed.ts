/**
 * First-user bootstrap.
 *
 * If the DB has no users and SEED_ADMIN_USERNAME + SEED_ADMIN_PASSWORD are set,
 * create an admin user from those env vars. This runs at most once — once any
 * user exists the seed env vars are ignored.
 *
 * The seed user is created via better-auth's internal API so the password is
 * hashed correctly, then immediately promoted to admin via a direct DB update.
 */
import { eq } from 'drizzle-orm';
import type { Auth } from './auth';
import type { DrizzleClient } from './db';
import { usersTable } from './db/schema';

export async function maybeSeedAdmin(
	db: DrizzleClient,
	auth: Auth,
	env: { SEED_ADMIN_USERNAME?: string; SEED_ADMIN_PASSWORD?: string }
) {
	const { SEED_ADMIN_USERNAME: username, SEED_ADMIN_PASSWORD: password } = env;
	if (!username || !password) {
		return;
	}

	// Fast path — skip if users already exist.
	const existing = await db.select().from(usersTable).limit(1);
	if (existing.length > 0) {
		return;
	}

	// Create the user via better-auth so the password is hashed correctly.
	// We use a synthetic email address; the app never sends email.
	const result = await auth.api.signUpEmail({
		body: {
			name: username,
			email: `${username}@family.local`,
			password,
			username
		}
	});

	if (!result?.user?.id) {
		console.error('[seed] Failed to create seed admin user');
		return;
	}

	// Promote to admin — better-auth doesn't expose isAdmin through signUpEmail.
	await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, result.user.id));

	console.log(`[seed] Admin user "${username}" created.`);
}
