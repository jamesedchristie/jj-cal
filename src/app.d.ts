// See https://svelte.dev/docs/kit/types#app.d.ts
/// <reference types="./worker-configuration" />
/// <reference types="vite-plugin-pwa/info" />
import type { DrizzleClient } from '$lib/server/db';
import type { Auth } from '$lib/server/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: DrizzleClient;
			user: Auth['$Infer']['Session']['user'] | null;
			session: Auth['$Infer']['Session']['session'] | null;
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
