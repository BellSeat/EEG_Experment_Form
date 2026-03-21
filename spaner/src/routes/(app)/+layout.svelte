<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, currentUser } from '$lib/auth';
	import '../../app.css';

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/subjects', label: 'Subjects' },
		{ href: '/sessions', label: 'Sessions' },
		{ href: '/session_files', label: 'Session Files' },
		{ href: '/audit-log', label: 'Audit Log' },
	];

	let { data, children } = $props<{
		data: { pathname?: string };
		children: () => unknown;
	}>();

	async function handleLogout() {
		auth.logout();
		await goto('/');
	}

	function isNavActive(pathname: string | undefined, href: string) {
		if (!pathname) {
			return false;
		}
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<div class="app-shell">
	<aside class="app-sidebar">
		<div>
			<p class="eyebrow">SPANER Lab</p>
			<h1>Research Portal</h1>
			<p class="sidebar-copy">Subjects, sessions, uploads, and audit history in one place.</p>
		</div>

		<nav class="app-nav" aria-label="Portal navigation">
			{#each navItems as item}
				<a href={item.href} class:active={isNavActive(data.pathname, item.href)}>{item.label}</a>
			{/each}
		</nav>

		<div class="user-card">
			<p class="user-label">Signed in as</p>
			<strong>{$currentUser?.display_name ?? $currentUser?.username ?? 'Unknown user'}</strong>
			<span>{$currentUser?.email ?? 'No email available'}</span>
			<span class="role-badge">{$currentUser?.role ?? 'researcher'}</span>
			<button type="button" class="secondary-button sidebar-logout-button" onclick={handleLogout}>
				Logout
			</button>
		</div>
	</aside>

	<main class="app-main">
		{@render children()}
	</main>
</div>
