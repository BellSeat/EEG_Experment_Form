<script lang="ts">
	import { onMount } from 'svelte';
	import { getSessions } from '$lib/api';
	import type { Session } from '$lib/types';

	let sessions = $state<Session[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	function getSessionLabel(session: Session) {
		return session.session_label ?? session.title ?? `Session ${session.id}`;
	}

	function formatDate(value?: string | null) {
		return value
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(value),
				)
			: 'Pending';
	}

	onMount(async () => {
		try {
			const response = await getSessions();
			sessions = response.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load sessions.';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Sessions | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Sessions</p>
		<h2>Recording sessions and upload entry points</h2>
		<p class="page-copy">Each row links to a session detail page with file upload and refresh support.</p>
	</div>
	<div class="page-actions">
		<a href="/sessions/new" class="primary-link-button">New Session</a>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Queue</p>
			<h3>{isLoading ? 'Loading...' : `${sessions.length} session records`}</h3>
		</div>
	</div>

	{#if !sessions.length && !isLoading}
		<p class="empty-state">No sessions returned from the API yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Lobby</th>
						<th>Status</th>
						<th>Files</th>
						<th>Recorded</th>
					</tr>
				</thead>
				<tbody>
					{#each sessions as session}
						<tr>
							<td>
								<a href={`/sessions/${session.id}`} class="text-link">{getSessionLabel(session)}</a>
							</td>
							<td>
								<a href={`/subjects/${session.subject_id}`} class="text-link">
									{session.subject?.subject_code ?? session.subject?.code ?? `Lobby ${session.subject_id}`}
								</a>
							</td>
							<td><span class="role-badge">{session.status}</span></td>
							<td>{session.file_count ?? 0}</td>
							<td>{formatDate(session.session_date ?? session.recorded_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
