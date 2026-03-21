<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuditLog } from '$lib/api';
	import type { AuditLogEntry } from '$lib/types';

	let entries = $state<AuditLogEntry[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	function formatDate(value?: string) {
		return value
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(value),
				)
			: 'Pending';
	}

	onMount(async () => {
		try {
			const response = await getAuditLog();
			entries = response.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load the audit log.';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Audit Log | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Audit Log</p>
		<h2>Recent actions across portal resources</h2>
		<p class="page-copy">This route is now backed by `/audit-log` and ready for backend pagination later.</p>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">History</p>
			<h3>{isLoading ? 'Loading...' : `${entries.length} audit entries`}</h3>
		</div>
	</div>

	{#if !entries.length && !isLoading}
		<p class="empty-state">No audit events returned yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Action</th>
						<th>Resource</th>
						<th>Actor</th>
						<th>Created</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as entry}
						<tr>
							<td>{entry.action}</td>
							<td>{entry.resource_type}{entry.resource_id ? ` #${entry.resource_id}` : ''}</td>
							<td>{entry.actor?.username ?? entry.actor?.email ?? 'system'}</td>
							<td>{formatDate(entry.created_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
