<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError, register } from '$lib/api';
	import { REGISTRATION_INVITATION_CODE } from '$lib/config';
	import '$lib/styles/portal-page.css';

	const navItems = ['Home', 'About us', 'Contact', 'GitHub'];
	const INVITATION_CODE = REGISTRATION_INVITATION_CODE;

	let displayName = $state('');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let invitationCode = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	function goToLogin() {
		goto('/');
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const normalizedInvitationCode = invitationCode.trim();
		if (normalizedInvitationCode !== INVITATION_CODE) {
			errorMessage = 'Invitation code is invalid.';
			return;
		}

		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters.';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		isSubmitting = true;

		try {
			const response = await register({
				username: username.trim(),
				email: email.trim(),
				password,
				invitation_code: normalizedInvitationCode,
				display_name: displayName.trim() || undefined,
			});

			successMessage = response.message ?? 'Account created. Redirecting to sign in...';

			await new Promise<void>((resolve) => {
				window.setTimeout(resolve, 1200);
			});

			await goto('/');
		} catch (error) {
			errorMessage =
				error instanceof ApiError ? error.message : 'Unable to create your account right now. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Register | SPANER Lab Portal</title>
</svelte:head>

<div class="portal-page page-shell">
	<main class="portal-card">
		<section class="auth-panel">
			<div class="brand">SPANER Lab</div>

			<div class="auth-copy">
				<h1>Create your portal account</h1>
				<p>Registration is invite-only. Use the invitation code you were given to unlock access.</p>
			</div>

			<form class="login-form" onsubmit={handleSubmit}>
				<label class="field-group" for="display-name">
					<span class="field-label">Display Name</span>
					<input
						id="display-name"
						name="display-name"
						type="text"
						placeholder="Your name"
						bind:value={displayName}
						autocomplete="name"
					/>
				</label>

				<label class="field-group" for="register-username">
					<span class="field-label">Username</span>
					<input
						id="register-username"
						name="username"
						type="text"
						placeholder="Choose a username"
						bind:value={username}
						autocomplete="username"
						required
					/>
				</label>

				<label class="field-group" for="register-email">
					<span class="field-label">Email</span>
					<input
						id="register-email"
						name="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						autocomplete="email"
						required
					/>
				</label>

				<label class="field-group" for="register-password">
					<span class="field-label">Password</span>
					<input
						id="register-password"
						name="password"
						type="password"
						placeholder="At least 8 characters"
						bind:value={password}
						autocomplete="new-password"
						minlength="8"
						required
					/>
				</label>

				<label class="field-group" for="confirm-password">
					<span class="field-label">Confirm Password</span>
					<input
						id="confirm-password"
						name="confirm-password"
						type="password"
						placeholder="Re-enter your password"
						bind:value={confirmPassword}
						autocomplete="new-password"
						minlength="8"
						required
					/>
				</label>

				<label class="field-group" for="invitation-code">
					<span class="field-label">Invitation Code</span>
					<input
						id="invitation-code"
						name="invitation-code"
						type="text"
						placeholder="Enter your invitation code"
						bind:value={invitationCode}
						autocomplete="off"
						required
					/>
				</label>

				{#if errorMessage}
					<p class="form-message error">{errorMessage}</p>
				{/if}

				{#if successMessage}
					<p class="form-message success">{successMessage}</p>
				{/if}

				<div class="actions">
					<button type="submit" class="button-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Creating account...' : 'Create Account'}
					</button>
					<button type="button" class="button-secondary" onclick={goToLogin}>Back to Login</button>
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
