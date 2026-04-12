<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	function isActive(path: string): boolean {
		return page.url.pathname.startsWith(path);
	}
</script>

<nav class="bottom-nav">
	<a href={resolve('/calendars')} class="nav-item" class:active={isActive('/calendars')} aria-current={isActive('/calendars') ? 'page' : undefined}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<rect x="3" y="4" width="18" height="18" rx="2"/>
			<line x1="16" y1="2" x2="16" y2="6"/>
			<line x1="8" y1="2" x2="8" y2="6"/>
			<line x1="3" y1="10" x2="21" y2="10"/>
		</svg>
		<span>Calendar</span>
	</a>

	<a href={resolve('/tasks')} class="nav-item" class:active={isActive('/tasks')} aria-current={isActive('/tasks') ? 'page' : undefined}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M9 11l3 3L22 4"/>
			<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
		</svg>
		<span>Tasks</span>
	</a>

	<a href={resolve('/lists')} class="nav-item" class:active={isActive('/lists')} aria-current={isActive('/lists') ? 'page' : undefined}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="8" y1="6" x2="21" y2="6"/>
			<line x1="8" y1="12" x2="21" y2="12"/>
			<line x1="8" y1="18" x2="21" y2="18"/>
			<circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/>
			<circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
			<circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>
		</svg>
		<span>Lists</span>
	</a>

	<a href={resolve('/budget')} class="nav-item" class:active={isActive('/budget')} aria-current={isActive('/budget') ? 'page' : undefined}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="12" y1="1" x2="12" y2="23"/>
			<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
		</svg>
		<span>Budget</span>
	</a>
</nav>

<style>
	.bottom-nav {
		flex: none;
		display: flex;
		border-top: 1px solid #e5e7eb;
		background: #fff;
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 10px 4px;
		text-decoration: none;
		color: #9ca3af;
		font-size: 11px;
		font-weight: 500;
		transition: color 0.15s ease;

		svg {
			width: 22px;
			height: 22px;
		}
	}

	.nav-item.active {
		color: #111827;
	}

	.nav-item:not(.active):active {
		color: #6b7280;
	}
</style>
