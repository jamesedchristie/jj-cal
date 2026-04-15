<script lang="ts">
	import { resolve } from '$app/paths';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { addShare, getList, getShareableUsers, getShares, removeShare, updateShare } from './data.remote';
	import type { Permission } from '$lib/server/db/schema';

	const list = $derived(await getList());
	const shares = $derived(await getShares());
	const shareable = $derived(await getShareableUsers());

	const isOwner = $derived(list.role === 'owner');

	let selectedUserId = $state<string | null>(null);
	let selectedPermission = $state<Permission>('editor');
</script>

<div class="page">
	<div class="page-header">
		<a href={resolve(`/lists/${list.id}`)} class="back-link" aria-label="Back to list">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<polyline points="15 18 9 12 15 6"/>
			</svg>
		</a>
		<div class="header-text">
			<h1>Share</h1>
			<p class="list-name">{list.name}</p>
		</div>
	</div>

	<div class="section">
		<h2 class="section-heading">Who has access</h2>

		<ul class="member-list">
			<!-- Owner row (always first, implicit) -->
			<li class="member-row">
				<div class="member-info">
					<div class="avatar-wrap">
						<svg class="owner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
							<circle cx="12" cy="7" r="4"/>
						</svg>
					</div>
					<span class="member-name">You (owner)</span>
				</div>
				<span class="perm-badge owner">Owner</span>
			</li>

			{#each shares as share (share.shareId)}
				{@const toggle = updateShare.for(share.shareId)}
				{@const del = removeShare.for(share.shareId)}
				<li class="member-row" class:pending={!!toggle.pending || !!del.pending}>
					<div class="member-info">
						<UserAvatar
							name={share.name}
							displayName={share.displayName}
							colour={share.colour}
							size="sm"
						/>
						<span class="member-name">{share.displayName ?? share.name}</span>
					</div>

					<div class="member-actions">
						{#if isOwner}
							<form {...toggle}>
								<input {...toggle.fields.share_id.as('hidden', share.shareId)} />
								<select
									name={toggle.fields.permission.name}
									onchange={(e) => {
										(e.currentTarget.closest('form') as HTMLFormElement).requestSubmit();
									}}
									class="perm-select"
								>
									<option value="viewer" selected={share.permission === 'viewer'}>Viewer</option>
									<option value="editor" selected={share.permission === 'editor'}>Editor</option>
								</select>
							</form>
							<form {...del}>
								<input {...del.fields.share_id.as('hidden', share.shareId)} />
								<button type="submit" class="remove-btn" aria-label="Remove access">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<line x1="18" y1="6" x2="6" y2="18"/>
										<line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							</form>
						{:else}
							<span class="perm-badge {share.permission}">{share.permission === 'editor' ? 'Editor' : 'Viewer'}</span>
						{/if}
					</div>
				</li>
			{/each}

			{#if shares.length === 0}
				<li class="empty-shares">Only you have access.</li>
			{/if}
		</ul>
	</div>

	{#if isOwner && shareable.length > 0}
		<div class="section">
			<h2 class="section-heading">Add person</h2>

			<form
				{...addShare.enhance(async ({ form, submit }) => {
					await submit();
					form.reset();
					selectedUserId = null;
					selectedPermission = 'editor';
				})}
				class="add-form"
			>
				<div class="user-picker">
					{#each shareable as u (u.id)}
						<label class="user-option" class:selected={selectedUserId === u.id}>
							<input
								type="radio"
								name={addShare.fields.user_id.name}
								value={u.id}
								checked={selectedUserId === u.id}
								onchange={() => (selectedUserId = u.id)}
								class="sr-only"
							/>
							<UserAvatar name={u.name} displayName={u.displayName} colour={u.colour} size="sm" />
							<span>{u.displayName ?? u.name}</span>
						</label>
					{/each}
				</div>

				<div class="perm-picker">
					<label class="perm-option" class:selected={selectedPermission === 'editor'}>
						<input
							type="radio"
							name={addShare.fields.permission.name}
							value="editor"
							checked={selectedPermission === 'editor'}
							onchange={() => (selectedPermission = 'editor')}
							class="sr-only"
						/>
						<strong>Editor</strong>
						<span>Can add, check off, and delete items</span>
					</label>
					<label class="perm-option" class:selected={selectedPermission === 'viewer'}>
						<input
							type="radio"
							name={addShare.fields.permission.name}
							value="viewer"
							checked={selectedPermission === 'viewer'}
							onchange={() => (selectedPermission = 'viewer')}
							class="sr-only"
						/>
						<strong>Viewer</strong>
						<span>Can see items but not change them</span>
					</label>
				</div>

				<button type="submit" class="add-btn" disabled={!selectedUserId}>
					Add to list
				</button>
			</form>
		</div>
	{:else if isOwner && shareable.length === 0 && shares.length > 0}
		<p class="all-shared">All family members already have access.</p>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		padding-bottom: var(--space-8);
	}

	.page-header {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.back-link {
		display: flex;
		align-items: center;
		color: var(--color-text-muted);
		text-decoration: none;
		flex: none;
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-6);
			height: var(--space-6);
		}

		&:hover {
			color: var(--color-text);
		}
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	h1 {
		font-size: var(--font-size-lg);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
		line-height: var(--line-height-tight);
	}

	.list-name {
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-muted);
	}

	.section {
		padding: var(--space-5) var(--space-4) 0;
	}

	.section-heading {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-wide);
		margin-bottom: var(--space-3);
	}

	.member-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-1);
		border-radius: var(--radius-md);
		transition: opacity var(--duration-fast) var(--ease-standard);

		&.pending {
			opacity: 0.4;
		}
	}

	.member-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
		min-width: 0;
	}

	.avatar-wrap {
		width: var(--space-6);
		height: var(--space-6);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-subtle);
	}

	.owner-icon {
		width: var(--space-5);
		height: var(--space-5);
	}

	.member-name {
		font-size: var(--font-size-base);
		font-family: var(--font-body);
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.member-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: none;
	}

	.perm-badge {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);

		&.owner {
			background: var(--color-surface-sunken);
			color: var(--color-text-muted);
		}

		&.editor {
			background: var(--color-success-bg);
			color: var(--color-success-text);
		}

		&.viewer {
			background: var(--color-info-bg);
			color: var(--color-info-text);
		}
	}

	.perm-select {
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-2);
		cursor: pointer;
		outline: none;

		&:focus {
			border-color: var(--color-text);
		}
	}

	.remove-btn {
		background: none;
		border: none;
		padding: var(--space-1);
		cursor: pointer;
		color: var(--color-border-strong);
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm);
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-4);
			height: var(--space-4);
		}

		&:hover {
			color: var(--color-danger);
		}
	}

	.empty-shares {
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-subtle);
		padding: var(--space-2) var(--space-1);
	}

	.add-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.user-picker {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);
		font-size: var(--font-size-base);
		font-family: var(--font-body);

		&.selected {
			border-color: var(--color-text);
			background: var(--color-surface-sunken);
		}
	}

	.perm-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.perm-option {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);

		strong {
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		span {
			font-size: var(--font-size-xs);
			font-family: var(--font-body);
			color: var(--color-text-muted);
		}

		&.selected {
			border-color: var(--color-text);
			background: var(--color-surface-sunken);
		}
	}

	.add-btn {
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-3);
		font-size: var(--font-size-base);
		font-family: var(--font-body);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard),
			opacity var(--duration-fast) var(--ease-standard);

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}

		&:not(:disabled):active {
			background: var(--color-primary-hover);
		}
	}

	.all-shared {
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-subtle);
		padding: var(--space-5) var(--space-4) 0;
	}

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
