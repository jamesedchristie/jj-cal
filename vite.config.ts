import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'JJ Cal',
				short_name: 'JJ Cal',
				description: 'Shared family calendar',
				theme_color: '#3b82f6',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/calendars',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				// Installability only — don't cache routes or assets
				navigateFallback: null,
				globPatterns: []
			}
		})
	]
});
