import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'JJ Cal',
				short_name: 'JJ Cal',
				description: 'Shared family planner — calendar, tasks, and lists',
				theme_color: '#3b82f6',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/calendars',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
					{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
				]
			},
			workbox: {
				navigateFallback: null,
				// Precache JS/CSS bundles and static assets
				globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest}'],
				runtimeCaching: [
					{
						// Navigation (HTML): try network first, fall back to cache when offline
						urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
						handler: 'NetworkFirst' as const,
						options: {
							cacheName: 'navigation',
							networkTimeoutSeconds: 5,
							expiration: { maxEntries: 32, maxAgeSeconds: 86400 }
						}
					},
					{
						// Same-origin GET requests (RPC queries, etc.): try network first so we
						// don't show stale data after a mutation; fall back to cache on patchy
						// or offline networks after a short timeout.
						urlPattern: ({ sameOrigin, request }: { sameOrigin: boolean; request: Request }) =>
							sameOrigin && request.method === 'GET',
						handler: 'NetworkFirst' as const,
						options: {
							cacheName: 'api-get',
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 64, maxAgeSeconds: 86400 }
						}
					}
				]
			}
		})
	]
});
