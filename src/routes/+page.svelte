<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';

	// TODO (jj-cal-ruw8): wire up better-auth sign-in.
	// POST { username, password } as JSON to /api/auth/sign-in/username.
	let username = $state('');
	let password = $state('');
	let error = $state('');

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		const res = await fetch('/api/auth/sign-in/username', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (res.ok) {
			window.location.href = '/calendars';
		} else {
			const data = (await res.json().catch(() => null)) as { message?: string } | null;
			error = data?.message ?? 'Invalid credentials';
		}
	}
</script>

<section>
	<h2>Welcome to Family Hub</h2>

	<form onsubmit={handleLogin}>
		<label>
			<TextInput type="text" name="username" placeholder="Username" bind:value={username} />
		</label>
		<label>
			<TextInput type="password" name="password" placeholder="Password" bind:value={password} />
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<Button type="submit" style="width: 100%;">Sign in</Button>
	</form>
</section>

<style>
	section {
		flex: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin-bottom: 30%;
		gap: 2rem;
		& form {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			width: 100%;
			max-width: 300px;
			& label {
				width: 100%;
			}
		}
	}

	.error {
		color: var(--color-danger, red);
		font-size: var(--font-size-sm, 0.875rem);
		text-align: center;
	}
</style>
