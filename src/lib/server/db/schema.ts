import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('user', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	token: text('token')
});

export const eventsTable = sqliteTable('event', {
	id: integer('id').primaryKey(),
	datetime: integer('datetime').notNull(),
	text: text('text').notNull(),
	created_by_name: text('created_by_name').notNull(),
	created_by_id: integer('created_by_id').notNull()
});
