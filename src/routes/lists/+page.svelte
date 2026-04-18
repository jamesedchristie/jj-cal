<script lang="ts">
	import { resolve } from '$app/paths';
	import { getLists, newList, reorderListsCmd } from './data.remote';
	import type { ListType } from '$lib/server/db/schema';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import { sortable } from '$lib/sortable';
	import { tick } from 'svelte';

	const toastService = getToastService();

	const lists = $derived(await getLists());
	const taskLists = $derived(lists.filter((l) => l.type === 'todo'));
	const otherLists = $derived(lists.filter((l) => l.type !== 'todo'));

	let showForm = $state(false);
	let selectedType = $state<ListType>('shopping');
	let reorderFormEl = $state<HTMLFormElement>();
	let reorderIds = $state('');
	let taskListEl = $state<HTMLUListElement>();
	let otherListEl = $state<HTMLUListElement>();

	function handleListsReorder() {
		const taskIds = [...(taskListEl?.querySelectorAll<HTMLElement>('[data-id]') ?? [])].map((n) => n.dataset.id!);
		const otherIds = [...(otherListEl?.querySelectorAll<HTMLElement>('[data-id]') ?? [])].map((n) => n.dataset.id!);
		reorderIds = [...taskIds, ...otherIds].filter(Boolean).join(',');
		tick().then(() => reorderFormEl?.requestSubmit());
	}

	// Ordered for display: shopping first (most common), todo last (auto-created for personal use)
	const typeConfig: Record<ListType, { label: string; icon: string }> = {
		shopping: {
			label: 'Shopping',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`
		},
		packing: {
			label: 'Packing',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`
		},
		custom: {
			label: 'Custom',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/></svg>`
		},
		todo: {
			label: 'Task list',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
		}
	};
</script>

<div class="page">
	<div class="header">
		<h1>Lists</h1>
		{#if !showForm}
			<button class="new-btn" onclick={() => (showForm = true)}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<line x1="12" y1="5" x2="12" y2="19"/>
					<line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New list
			</button>
		{/if}
	</div>

	{#if showForm}
		<form
			{...newList.enhance(async ({ form, submit }) => {
				const ok = await submit();
				if (ok) {
					form.reset();
					showForm = false;
					selectedType = 'shopping';
				} else {
					toastService().show(new ToastMessage('Failed to create list', { type: 'error' }));
				}
			})}
			class="new-form"
		>
			<input
				{...newList.fields.name.as('text')}
				placeholder="List name…"
				autocomplete="off"
				class="name-input"
			/>
			<div class="type-row">
			{#each Object.entries(typeConfig) as [type, cfg]}
					<label class="type-option" class:selected={selectedType === type}>
						<input
							type="radio"
							name="type"
							value={type}
							checked={selectedType === type}
							onchange={() => (selectedType = type as ListType)}
							class="sr-only"
						/>
						{cfg.label}
					</label>
				{/each}
			</div>
			<div class="form-actions">
				<button type="button" class="cancel-btn" onclick={() => (showForm = false)}>Cancel</button>
				<button type="submit" class="create-btn">Create</button>
			</div>
		</form>
	{/if}

	<form
		bind:this={reorderFormEl}
		{...reorderListsCmd.enhance(async ({ submit }) => { await submit(); })}
		style="display:none"
	>
		<input type="hidden" name="ids" value={reorderIds} />
	</form>

	{#if lists.length === 0 && !showForm}
		<p class="empty">No lists yet. Create one to get started.</p>
	{:else}
		<!-- Task lists — todo-type, also surfaced in the Tasks tab -->
		{#if taskLists.length > 0}
			<div class="section">
				<div class="section-header">
					<span class="section-label">Task lists</span>
					<a href={resolve('/tasks')} class="section-link">View in Tasks →</a>
				</div>
				<ul class="list-cards" bind:this={taskListEl} {@attach sortable({ onReorder: handleListsReorder })}>
					{#each taskLists as list (list.id)}
						{@const cfg = typeConfig[list.type]}
						<li data-id={list.id}>
							<span class="drag-handle" aria-hidden="true">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
							</span>
							<a href={resolve(`/lists/${list.id}`)} class="card card--task">
								<span class="card-icon">{@html cfg.icon}</span>
								<span class="card-name">{list.name}</span>
								{#if list.role !== 'owner'}
									<span class="card-shared">Shared</span>
								{/if}
								{#if list.incompleteCount > 0}
									<span class="card-count">{list.incompleteCount}</span>
								{/if}
								<svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<polyline points="9 18 15 12 9 6"/>
								</svg>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Other lists — shopping, packing, custom -->
		{#if otherLists.length > 0}
			{#if taskLists.length > 0}
				<div class="section-header">
					<span class="section-label">Lists</span>
				</div>
			{/if}
			<ul class="list-cards" bind:this={otherListEl} {@attach sortable({ onReorder: handleListsReorder })}>
				{#each otherLists as list (list.id)}
					{@const cfg = typeConfig[list.type]}
					<li data-id={list.id}>
						<span class="drag-handle" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
						</span>
						<a href={resolve(`/lists/${list.id}`)} class="card">
							<span class="card-icon">{@html cfg.icon}</span>
							<span class="card-name">{list.name}</span>
							{#if list.role !== 'owner'}
								<span class="card-shared">Shared</span>
							{/if}
							<span class="card-type">{cfg.label}</span>
							{#if list.incompleteCount > 0}
								<span class="card-count">{list.incompleteCount}</span>
							{/if}
							<svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<polyline points="9 18 15 12 9 6"/>
							</svg>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		padding: var(--space-4);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}

	h1 {
		font-size: var(--font-size-lg);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.new-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-4);
			height: var(--space-4);
		}

		&:active {
			background: var(--color-primary-hover);
		}
	}

	.new-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	.name-input {
		width: 100%;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		font-size: var(--font-size-base);
		font-family: var(--font-body);
		background: var(--color-surface-sunken);
		color: var(--color-text);
		outline: none;
		box-sizing: border-box;
		transition: border-color var(--duration-fast) var(--ease-standard);

		&:focus {
			border-color: var(--color-text);
			background: var(--color-surface);
		}

		&::placeholder {
			color: var(--color-text-subtle);
		}
	}

	.type-row {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.type-option {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		cursor: pointer;
		color: var(--color-text-muted);
		transition: background var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);

		&.selected {
			background: var(--color-primary);
			color: var(--color-primary-text);
			border-color: var(--color-primary);
		}
	}

	.form-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.cancel-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:active {
			background: var(--color-surface-sunken);
		}
	}

	.create-btn {
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:active {
			background: var(--color-primary-hover);
		}
	}

	.empty {
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		text-align: center;
		margin-top: var(--space-12);
	}

	.section {
		margin-bottom: var(--space-2);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-2) var(--space-1);
	}

	.section-label {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-subtle);
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-wide);
	}

	.section-link {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-accent);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.list-cards {
		display: flex;
		flex-direction: column;
		gap: 2px;

		li {
			display: flex;
			align-items: center;
		}
	}

	.card {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-2);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--color-text);
		transition: background var(--duration-fast) var(--ease-standard);
		min-width: 0;

		&:active {
			background: var(--color-surface-sunken);
		}
	}

	.drag-handle {
		flex: none;
		display: flex;
		align-items: center;
		color: var(--color-border);
		cursor: grab;
		touch-action: none;
		opacity: 0;
		padding: var(--space-2) var(--space-1);
		transition: opacity var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-4);
			height: var(--space-4);
		}
	}

	li:hover .drag-handle,
	li:focus-within .drag-handle {
		opacity: 1;
	}

	:global(.drag-ghost) {
		opacity: 0.4;
	}

	:global(.drag-chosen .card) {
		background: var(--color-surface-raised);
	}

	.card--task {
		background: var(--color-surface-sunken);
	}

	.card-icon {
		flex: none;
		display: flex;
		align-items: center;
		color: var(--color-text-muted);

		:global(svg) {
			width: var(--space-5);
			height: var(--space-5);
		}
	}

	.card-name {
		flex: 1;
		font-size: var(--font-size-base);
		font-family: var(--font-body);
	}

	.card-shared {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		color: var(--color-accent);
		background: var(--color-info-bg);
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
	}

	.card-type {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-subtle);
	}

	.card-count {
		min-width: var(--space-5);
		height: var(--space-5);
		border-radius: var(--radius-full);
		background: var(--color-primary);
		color: var(--color-primary-text);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-semibold);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-1);
	}

	.card-chevron {
		flex: none;
		width: var(--space-4);
		height: var(--space-4);
		color: var(--color-border-strong);
	}

	/* Visually hide radio inputs while keeping them accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
