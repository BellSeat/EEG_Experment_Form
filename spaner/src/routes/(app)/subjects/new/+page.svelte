<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSubject } from '$lib/api';

	let subjectCode = $state('');
	let status = $state<'active' | 'inactive' | 'archived'>('active');
	let notes = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		isSubmitting = true;

		try {
			const created = await createSubject({
				subject_code: subjectCode.trim(),
				status,
				notes: notes.trim() || null,
			});
			await goto(`/subjects/${created.id}`);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to create the lobby.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>New Lobby | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Lobby</p>
		<h2>Create a new subject lobby</h2>
		<p class="page-copy">This is the top-level collaboration space. Members invited here can access its sessions based on their permissions.</p>
	</div>
	<div class="page-actions">
		<a href="/subjects" class="secondary-link-button">Back to Lobbies</a>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card form-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Lobby Form</p>
			<h3>New subject lobby</h3>
		</div>
	</div>

	<form class="session-form" onsubmit={handleSubmit}>
		<div class="form-grid">
			<label class="form-field">
				<span class="field-caption">Lobby Code</span>
				<input type="text" placeholder="Example: LOBBY-001" bind:value={subjectCode} required />
			</label>

			<label class="form-field">
				<span class="field-caption">Status</span>
				<select bind:value={status}>
					<option value="active">active</option>
					<option value="inactive">inactive</option>
					<option value="archived">archived</option>
				</select>
			</label>
		</div>

		<label class="form-field form-field-full">
			<span class="field-caption">Notes</span>
			<textarea
				rows="5"
				placeholder="Lobby context, enrollment notes, or collaboration details."
				bind:value={notes}
			></textarea>
		</label>

		<div class="form-actions">
			<a href="/subjects" class="secondary-link-button">Cancel</a>
			<button type="submit" class="primary-button" disabled={isSubmitting}>
				{isSubmitting ? 'Creating...' : 'Create Lobby'}
			</button>
		</div>
	</form>
</section>
