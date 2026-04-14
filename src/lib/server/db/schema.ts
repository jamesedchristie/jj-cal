import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Auth tables — managed by better-auth. Field names match better-auth's
// default snake_case Drizzle schema. The JS export names follow our
// *Table convention; we map them to better-auth's model names in auth.ts.
// ---------------------------------------------------------------------------

export const usersTable = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	// username plugin — allows sign-in by username instead of email
	username: text('username').unique(),
	displayUsername: text('display_username'),
	// App-level fields
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

export const sessionsTable = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent')
});

export const accountsTable = sqliteTable('account', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	expiresAt: integer('expires_at', { mode: 'timestamp' }),
	password: text('password'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const verificationsTable = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
});

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const calendarsTable = sqliteTable('calendar', {
	id: integer('id').primaryKey(),
	name: text('name').notNull().unique(),
	slug: text('slug').notNull().unique(),
	created_by_name: text('created_by_name').notNull(),
	created_by_id: text('created_by_id').notNull()
});

export const eventsTable = sqliteTable('event', {
	id: integer('id').primaryKey(),
	calendar_id: integer('calendar_id').notNull(),
	calendar_slug: text('calendar_slug').notNull(),
	datetime: integer('datetime').notNull(),
	text: text('text').notNull(),
	created_by_name: text('created_by_name').notNull(),
	created_by_id: text('created_by_id').notNull()
});

export const todosTable = sqliteTable('todo', {
	id: integer('id').primaryKey(),
	text: text('text').notNull(),
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completed_at: integer('completed_at'),
	due_date: text('due_date'),
	sort_order: integer('sort_order').notNull().default(0),
	created_at: integer('created_at').notNull(),
	created_by_name: text('created_by_name').notNull(),
	created_by_id: text('created_by_id').notNull()
});
