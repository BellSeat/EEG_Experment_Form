<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSession, getExperimentPlans, getSubjects } from '$lib/api';
	import { currentUser } from '$lib/auth';
	import type { ExperimentPlan, Subject } from '$lib/types';

	let subjects = $state<Subject[]>([]);
	let plans = $state<ExperimentPlan[]>([]);
	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let selectedSubjectId = $state('');
	let selectedPlanId = $state('');
	let sessionLabel = $state('');
	let sessionDate = $state('');
	let status = $state<'planned' | 'in_progress' | 'completed' | 'failed' | 'archived'>('planned');
	let notes = $state('');

	function subjectLabel(subject: Subject) {
		return subject.subject_code ?? subject.code ?? `Lobby ${subject.id}`;
	}

	function planLabel(plan: ExperimentPlan) {
		return plan.name?.trim() ? plan.name : `Plan #${plan.id}`;
	}

	function creatableSubjects() {
		return subjects.filter((subject) => subject.current_user_capabilities.includes('session:create'));
	}

	function toIsoDateTime(value: string): string {
		return new Date(value).toISOString();
	}

	async function loadSubjectScopedOptions(subjectId: string) {
		if (!subjectId) {
			plans = [];
			selectedPlanId = '';
			return;
		}

		const planResponse = await getExperimentPlans(subjectId).catch(() => ({ items: [], total: 0 }));
		plans = planResponse.items;
		if (!planResponse.items.some((plan) => String(plan.id) === selectedPlanId)) {
			selectedPlanId = '';
		}
	}

	async function loadForm() {
		isLoading = true;
		errorMessage = '';

		try {
			const subjectResponse = await getSubjects();
			subjects = subjectResponse.items;
			selectedSubjectId = creatableSubjects()[0] ? String(creatableSubjects()[0].id) : '';

			const now = new Date();
			now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
			sessionDate = now.toISOString().slice(0, 16);

			if (!selectedSubjectId) {
				plans = [];
				errorMessage = 'No lobby with session create access is available right now.';
				return;
			}

			await loadSubjectScopedOptions(selectedSubjectId);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load session form options.';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadForm);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		if (!$currentUser) {
			errorMessage = 'You need to be signed in before creating a session.';
			return;
		}
		if (!selectedSubjectId) {
			errorMessage = 'Choose a lobby before creating the session.';
			return;
		}

		isSubmitting = true;

		try {
			const created = await createSession({
				subject_id: Number(selectedSubjectId),
				experiment_plan_id: selectedPlanId ? Number(selectedPlanId) : null,
				operator_id: Number($currentUser.id),
				session_label: sessionLabel.trim(),
				session_date: toIsoDateTime(sessionDate),
				status,
				notes: notes.trim() || null,
			});

			await goto(`/sessions/${created.id}`);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to create the session.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>New Session | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Sessions</p>
		<h2>Create a new session</h2>
		<p class="page-copy">Choose the lobby first, then set the operator, date, and optional experiment plan.</p>
	</div>
	<div class="page-actions">
		<a href="/sessions" class="secondary-link-button">Back to Sessions</a>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card form-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Session Form</p>
			<h3>{isLoading ? 'Loading form data...' : 'New session'}</h3>
		</div>
	</div>

	<form class="session-form" onsubmit={handleSubmit}>
		<div class="form-grid">
			<label class="form-field">
				<span class="field-caption">Lobby</span>
				<select
					bind:value={selectedSubjectId}
					required
					disabled={isLoading || !creatableSubjects().length}
					onchange={() => {
						errorMessage = '';
						void loadSubjectScopedOptions(selectedSubjectId);
					}}
				>
					<option value="" disabled selected={!selectedSubjectId}>Select lobby</option>
					{#each creatableSubjects() as subject}
						<option value={String(subject.id)}>{subjectLabel(subject)}</option>
					{/each}
				</select>
			</label>

			<label class="form-field">
				<span class="field-caption">Operator</span>
				<input
					type="text"
					value={$currentUser ? `${$currentUser.username} (#${$currentUser.id})` : 'No signed-in user'}
					readonly
				/>
			</label>

			<label class="form-field">
				<span class="field-caption">Session Label</span>
				<input type="text" placeholder="Example: Baseline EEG Visit" bind:value={sessionLabel} required />
			</label>

			<label class="form-field">
				<span class="field-caption">Session Date</span>
				<input type="datetime-local" bind:value={sessionDate} required />
			</label>

			<label class="form-field">
				<span class="field-caption">Experiment Plan</span>
				<select bind:value={selectedPlanId} disabled={isLoading || !selectedSubjectId}>
					<option value="">No plan linked yet</option>
					{#each plans as plan}
						<option value={String(plan.id)}>{planLabel(plan)}</option>
					{/each}
				</select>
			</label>

			<label class="form-field">
				<span class="field-caption">Status</span>
				<select bind:value={status}>
					<option value="planned">planned</option>
					<option value="in_progress">in_progress</option>
					<option value="completed">completed</option>
					<option value="failed">failed</option>
					<option value="archived">archived</option>
				</select>
			</label>
		</div>

		<label class="form-field form-field-full">
			<span class="field-caption">Notes</span>
			<textarea rows="5" placeholder="Session context, acquisition notes, or setup details." bind:value={notes}></textarea>
		</label>

		<div class="form-actions">
			<a href="/sessions" class="secondary-link-button">Cancel</a>
			<button type="submit" class="primary-button" disabled={isSubmitting || isLoading || !$currentUser || !selectedSubjectId}>
				{isSubmitting ? 'Creating...' : 'Create Session'}
			</button>
		</div>
	</form>
</section>
