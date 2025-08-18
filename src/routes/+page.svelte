<script>
	import { login } from './login.remote';
</script>

<h2>Welcome to JJ Cal</h2>

<form {...login}>
	<label>
		<input type="password" name="password" placeholder="Enter your password" />
	</label>
	<button>Login</button>
</form>
