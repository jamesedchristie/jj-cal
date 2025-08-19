import { createClient } from '@libsql/client';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSql } from 'drizzle-orm/libsql';
import * as schema from './schema';

export function getDb(db?: D1Database, databaseUrl?: string) {
	if (db) {
		console.log('Using D1 database');
		return drizzleD1(db, { schema });
	}

	if (databaseUrl) {
		console.log('Using LibSQL database');
		const client = createClient({ url: databaseUrl });
		return drizzleLibSql(client, { schema });
	}

	throw new Error('No database configuration found');
}

export type DrizzleClient = ReturnType<typeof getDb>;
