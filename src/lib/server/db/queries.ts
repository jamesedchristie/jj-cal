import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '.';
import { eventsTable, usersTable } from './schema';

export async function getUserByName(name: string) {
	const user = await db.select().from(usersTable).where(eq(usersTable.name, name));
	return user[0] ?? null;
}

export async function getUserByToken(token: string) {
	const user = await db.select().from(usersTable).where(eq(usersTable.token, token));
	return user[0] ?? null;
}

export async function createUser(name: string) {
	const user = await db.insert(usersTable).values({ name }).returning();
	return user[0];
}

export async function setUserToken(user_id: number, token: string) {
	const user = await db
		.update(usersTable)
		.set({ token })
		.where(eq(usersTable.id, user_id))
		.returning();
	return user[0];
}

export async function createEvent(input: { datetime: number; text: string; name: string }) {
	const { datetime, text, name } = input;
	const user = await getUserByName(name);
	if (!user) throw 'User not found';
	const event = await db
		.insert(eventsTable)
		.values({
			datetime,
			text,
			created_by_name: user.name,
			created_by_id: user.id
		})
		.returning();
	return event[0];
}

export async function updateEventText(id: number, text: string) {
	const event = await db
		.update(eventsTable)
		.set({ text })
		.where(eq(eventsTable.id, id))
		.returning();
	return event[0];
}

export async function getEventsForMonth(year: number, month: number) {
	const startOfMonth = new Date(year, month - 1, 1).getTime();
	const endOfMonth = new Date(year, month, 1).getTime();
	const events = await db
		.select()
		.from(eventsTable)
		.where(and(gt(eventsTable.datetime, startOfMonth), lt(eventsTable.datetime, endOfMonth)));
	return events;
}
