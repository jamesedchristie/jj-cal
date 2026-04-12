<script lang="ts">
	import { addTodo, getTodos, removeTodo, toggleTodo } from './data.remote';

	const incomplete = $derived((await getTodos()).filter((t) => !t.completed));
	const complete = $derived((await getTodos()).filter((t) => t.completed));
</script>

<div class="page">
	<h1>Tasks</h1>

	<form
		{...addTodo.enhance(async ({ form, submit }) => {
			await submit();
			form.reset();
		})}
		class="add-form"
	>
		<input
			{...addTodo.fields.text.as('text')}
			placeholder="Add a task…"
			autocomplete="off"
		/>
		<button type="submit" aria-label="Add task">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<line x1="12" y1="5" x2="12" y2="19"/>
				<line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
		</button>
	</form>

	<ul class="todo-list">
		{#each incomplete as todo (todo.id)}
			{@const toggle = toggleTodo.for(todo.id)}
			{@const remove = removeTodo.for(todo.id)}
			<li class:pending={!!toggle.pending || !!remove.pending}>
				<form {...toggle}>
					<input type="hidden" {...toggle.fields.id.as('hidden', String(todo.id))} />
					<input type="hidden" {...toggle.fields.completed.as('hidden', 'true')} />
					<button type="submit" class="check" aria-label="Mark complete">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<circle cx="12" cy="12" r="10"/>
						</svg>
					</button>
				</form>
				<span class="text">{todo.text}</span>
				<form {...remove}>
					<input type="hidden" {...remove.fields.id.as('hidden', String(todo.id))} />
					<button type="submit" class="delete" aria-label="Delete task">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</form>
			</li>
		{/each}
	</ul>

	{#if complete.length > 0}
		<details class="completed-section">
			<summary>{complete.length} completed</summary>
			<ul class="todo-list completed">
				{#each complete as todo (todo.id)}
					{@const toggle = toggleTodo.for(`uncomplete-${todo.id}`)}
					{@const remove = removeTodo.for(`done-${todo.id}`)}
					<li>
						<form {...toggle}>
							<input type="hidden" {...toggle.fields.id.as('hidden', String(todo.id))} />
							<input type="hidden" {...toggle.fields.completed.as('hidden', 'false')} />
							<button type="submit" class="check done" aria-label="Mark incomplete">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<circle cx="12" cy="12" r="10"/>
									<path d="M8 12l3 3 5-5"/>
								</svg>
							</button>
						</form>
						<span class="text">{todo.text}</span>
						<form {...remove}>
							<input type="hidden" {...remove.fields.id.as('hidden', String(todo.id))} />
							<button type="submit" class="delete" aria-label="Delete task">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<line x1="18" y1="6" x2="6" y2="18"/>
									<line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	h1 {
		flex: none;
		padding: 1rem 1rem 0.5rem;
		font-size: 1.4rem;
	}

	.add-form {
		flex: none;
		display: flex;
		gap: 0;
		margin: 0 1rem 1rem;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		overflow: hidden;
		background: #fff;

		input {
			flex: 1;
			border: none;
			outline: none;
			padding: 0.75rem 1rem;
			font-size: 1rem;
			background: transparent;
		}

		button {
			flex: none;
			background: #111827;
			border: none;
			color: #fff;
			width: 44px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;

			svg {
				width: 18px;
				height: 18px;
			}

			&:active {
				background: #374151;
			}
		}
	}

	.todo-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 2px;

		li {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.6rem 0.5rem;
			border-radius: 8px;
			transition: opacity 0.15s ease;

			&.pending {
				opacity: 0.4;
			}
		}
	}

	.check {
		flex: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: #d1d5db;
		display: flex;
		align-items: center;
		transition: color 0.15s ease;

		svg {
			width: 24px;
			height: 24px;
		}

		&:hover {
			color: #6b7280;
		}

		&.done {
			color: #10b981;

			&:hover {
				color: #059669;
			}
		}
	}

	.text {
		flex: 1;
		font-size: 1rem;
		line-height: 1.4;

		.completed & {
			text-decoration: line-through;
			color: #9ca3af;
		}
	}

	.delete {
		flex: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: #e5e7eb;
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity 0.15s ease, color 0.15s ease;

		svg {
			width: 18px;
			height: 18px;
		}

		&:hover {
			color: #ef4444;
		}
	}

	li:hover .delete,
	li:focus-within .delete {
		opacity: 1;
	}

	.completed-section {
		flex: none;
		padding: 0.5rem 1rem 1rem;

		summary {
			cursor: pointer;
			font-size: 0.85rem;
			color: #9ca3af;
			padding: 0.5rem 0;
			user-select: none;
		}

		.todo-list {
			flex: none;
			overflow: visible;
			padding: 0;
			margin-top: 0.25rem;
		}
	}
</style>
