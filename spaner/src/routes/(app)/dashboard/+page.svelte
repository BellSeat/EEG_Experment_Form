<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuditLog, getSessionFiles, getSessions, getSubjects } from '$lib/api';
	import { currentUser } from '$lib/auth';
	import type { AuditLogEntry, DashboardSummary } from '$lib/types';

	let summary = $state<DashboardSummary>({
		subjects: 0,
		sessions: 0,
		session_files: 0,
		recent_audit_events: 0,
	});
	let recentAudit = $state<AuditLogEntry[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	function formatDate(value?: string) {
		if (!value) {
			return 'Pending';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	onMount(async () => {
		isLoading = true;
		errorMessage = '';

		try {
			const [subjects, sessions, files, audit] = await Promise.all([
				getSubjects(),
				getSessions(),
				getSessionFiles(),
				getAuditLog().catch(() => ({ items: [], total: 0 })),
			]);

			summary = {
				subjects: subjects.total,
				sessions: sessions.total,
				session_files: files.total,
				recent_audit_events: audit.total,
			};
			recentAudit = audit.items.slice(0, 5);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load dashboard.';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Dashboard | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Dashboard</p>
		<h2>Welcome back, {$currentUser?.display_name ?? $currentUser?.username ?? 'researcher'}.</h2>
		<p class="page-copy">This view now loads live summary data instead of static placeholders.</p>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="stats-grid">
	<article class="stat-card">
		<span>Subjects</span>
		<strong>{isLoading ? '...' : summary.subjects}</strong>
	</article>
	<article class="stat-card">
		<span>Sessions</span>
		<strong>{isLoading ? '...' : summary.sessions}</strong>
	</article>
	<article class="stat-card">
		<span>Session Files</span>
		<strong>{isLoading ? '...' : summary.session_files}</strong>
	</article>
	<article class="stat-card">
		<span>Audit Events</span>
		<strong>{isLoading ? '...' : summary.recent_audit_events}</strong>
	</article>
</section>

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Recent Activity</p>
			<h3>Latest audit events</h3>
		</div>
		<a href="/audit-log" class="text-link">View full log</a>
	</div>

	{#if !recentAudit.length && !isLoading}
		<p class="empty-state">No audit events returned yet.</p>
	{:else}
		<div class="list-stack">
			{#each recentAudit as entry}
				<div class="list-row">
					<div>
						<strong>{entry.action}</strong>
						<p>{entry.resource_type}{entry.resource_id ? ` #${entry.resource_id}` : ''}</p>
					</div>
					<div class="muted-meta">
						<span>{entry.actor?.username ?? 'system'}</span>
						<span>{formatDate(entry.created_at)}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
