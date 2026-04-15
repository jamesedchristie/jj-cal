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
	deletedAt: integer('deleted_at', { mode: 'timestamp' }),
	// jj-cal-aovo: profile fields
	displayName: text('display_name'),
	colour: text('colour')  // CSS variable suffix, e.g. "family-3" → var(--color-family-3)
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

// jj-cal-4rop: invite system
export const invitesTable = sqliteTable('invite', {
	id: text('id').primaryKey(),
	token: text('token').notNull().unique(),
	createdById: text('created_by_id').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	revokedAt: integer('revoked_at', { mode: 'timestamp' })
});

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

// jj-cal-o6bu / jj-cal-m3vk: generic lists model

export const LIST_TYPES = ['todo', 'shopping', 'packing', 'custom'] as const;
export type ListType = (typeof LIST_TYPES)[number];

export const listsTable = sqliteTable('list', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type', { enum: LIST_TYPES }).notNull().default('todo'),
	createdById: text('created_by_id').notNull().references(() => usersTable.id),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const RECURRENCE_INTERVALS = ['daily', 'weekly', 'fortnightly', 'monthly'] as const;
export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number];

export const listItemsTable = sqliteTable('list_item', {
	id: text('id').primaryKey(),
	listId: text('list_id')
		.notNull()
		.references(() => listsTable.id, { onDelete: 'cascade' }),
	text: text('text').notNull(),
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	dueDate: text('due_date'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	createdById: text('created_by_id').notNull(),
	assignedToId: text('assigned_to_id'),
	// jj-cal-9ol1: virtual recurrence — item re-appears once completedAt is
	// older than the interval. No new rows created; one row per recurring task.
	recurrenceInterval: text('recurrence_interval', { enum: RECURRENCE_INTERVALS })
});

// jj-cal-p8qn: resource sharing & ACL model

export const RESOURCE_TYPES = ['list', 'calendar'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const PERMISSION_LEVELS = ['viewer', 'editor'] as const;
export type Permission = (typeof PERMISSION_LEVELS)[number];

// Owner access is implicit (createdById on the resource). Shares only needed
// for non-owners. Unique on (resource_type, resource_id, user_id) enforced
// by the DB index — one permission level per (resource, user) pair.
export const resourceSharesTable = sqliteTable('resource_share', {
	id: text('id').primaryKey(),
	resourceType: text('resource_type', { enum: RESOURCE_TYPES }).notNull(),
	resourceId: text('resource_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => usersTable.id, { onDelete: 'cascade' }),
	permission: text('permission', { enum: PERMISSION_LEVELS }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	createdById: text('created_by_id')
		.notNull()
		.references(() => usersTable.id)
});
