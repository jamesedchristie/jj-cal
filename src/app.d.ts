// See https://svelte.dev/docs/kit/types#app.d.ts
/// <reference types="./worker-configuration" />
import type { DrizzleClient } from '$lib/server/db';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: DrizzleClient;
			user: { id: number; name: string; token?: string | null } | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
