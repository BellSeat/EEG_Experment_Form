<script lang="ts">
	import { onMount } from 'svelte';
	import { getSubjects } from '$lib/api';
	import type { Subject } from '$lib/types';

	let subjects = $state<Subject[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	function subjectLabel(subject: Subject) {
		return subject.subject_code ?? subject.code ?? `Subject ${subject.id}`;
	}

	function formatDate(value?: string) {
		return value
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
			: 'Not available';
	}

	onMount(async () => {
		try {
			const response = await getSubjects();
			subjects = response.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load subjects.';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Subjects | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Subjects</p>
		<h2>Study participants and enrollment status</h2>
		<p class="page-copy">This route is wired to `/subjects` and ready for real data.</p>
	</div>
	<div class="page-actions">
		<a href="/subjects/new" class="primary-link-button">New Subject</a>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Directory</p>
			<h3>{isLoading ? 'Loading...' : `${subjects.length} subject records`}</h3>
		</div>
	</div>

	{#if !subjects.length && !isLoading}
		<p class="empty-state">No subjects returned from the API yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Lobby</th>
						<th>Status</th>
						<th>Your Role</th>
						<th>Notes</th>
						<th>Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each subjects as subject}
						<tr>
							<td>
								<a href={`/subjects/${subject.id}`} class="text-link">{subjectLabel(subject)}</a>
							</td>
							<td><span class="role-badge">{subject.status}</span></td>
							<td>{subject.current_user_role ?? 'member'}</td>
							<td>{subject.notes ?? subject.description ?? 'No notes'}</td>
							<td>{formatDate(subject.updated_at ?? subject.created_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
