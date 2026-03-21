<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError, login } from '$lib/api';
	import { auth } from '$lib/auth';
	import '$lib/styles/portal-page.css';

	const navItems = ['Home', 'About us', 'Contact', 'GitHub'];

	let username = $state('');
	let password = $state('');
	let remember = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	function openRegistration() {
		goto('/register');
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		isSubmitting = true;

		try {
			const response = await login({
				username: username.trim(),
				password,
			});

			auth.login(response.token, response.user, remember);
			await goto('/dashboard');
		} catch (error) {
			errorMessage =
				error instanceof ApiError ? error.message : 'Unable to sign in right now. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>SPANER Lab Portal</title>
</svelte:head>

<div class="portal-page page-shell">
	<main class="portal-card">
		<section class="auth-panel">
			<div class="brand">SPANER Lab</div>

			<div class="auth-copy">
				<h1>SPANER Research Portal</h1>
				<p>Secure access for study operations, uploads, and audit-ready session tracking.</p>
			</div>

			<form class="login-form" onsubmit={handleSubmit}>
				<label class="field-group" for="username">
					<span class="field-label">Account</span>
					<input
						id="username"
						name="username"
						type="text"
						placeholder="Email address or username"
						bind:value={username}
						autocomplete="username"
						required
					/>
				</label>

				<label class="field-group" for="password">
					<span class="field-label field-label-hidden">Password</span>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="Password"
						bind:value={password}
						autocomplete="current-password"
						required
					/>
				</label>

				<div class="form-row">
					<label class="checkbox-row" for="remember">
						<input id="remember" type="checkbox" bind:checked={remember} />
						<span>Remember Me</span>
					</label>

					<a href="/" class="muted-link">Forgot Password?</a>
				</div>

				{#if errorMessage}
					<p class="form-message error">{errorMessage}</p>
				{/if}

				<div class="actions">
					<button type="submit" class="button-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Signing in...' : 'Login'}
					</button>
					<button type="button" class="button-secondary" onclick={openRegistration}>Sign Up</button>
				</div>
			</form>
		</section>

		<section class="visual-panel">
			<nav class="top-nav" aria-label="Main navigation">
				{#each navItems as item, index}
					<a href="/" class:active={index === 0}>{item}</a>
				{/each}
			</nav>

			<div class="illustration" aria-hidden="true">
				<div class="circle circle-large"></div>
				<div class="circle circle-small"></div>
				<div class="placeholder-card"></div>
				<div class="placeholder-lines">
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
		</section>
	</main>
</div>
