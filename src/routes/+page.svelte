<script>
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import { login } from './login.remote';
</script>

<section>
	<h2>Welcome to JJ Cal</h2>

	<form {...login}>
		<label>
			<TextInput type="password" name="password" placeholder="Enter your password" />
		</label>
		<Button type="submit" style="width: 100%;">Login</Button>
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
</style>
