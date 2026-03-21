<script lang="ts">
	import { currentUser } from '$lib/auth';
	import {
		createExperimentData,
		createExperimentPlan,
		deleteExperimentData,
		getExperimentData,
		updateExperimentData,
		updateSession,
	} from '$lib/api';
	import type { EntityId, ExperimentData, Session } from '$lib/types';

	type SessionPatchedHandler = (session: Session) => void;

	let {
		session,
		sessionId,
		onSessionPatched = () => {},
	} = $props<{
		session: Session | null;
		sessionId: string;
		onSessionPatched?: SessionPatchedHandler;
	}>();

	let isLoading = $state(false);
	let isCreatingPlan = $state(false);
	let isCreating = $state(false);
	let errorMessage = $state('');
	let message = $state('');
	let draftLocation = $state('');
	let records = $state<ExperimentData[]>([]);
	let savingIds = $state<Record<string, boolean>>({});
	let deletingIds = $state<Record<string, boolean>>({});

	function getSessionLabel(currentSession: Session | null): string {
		if (!currentSession) {
			return `Session ${sessionId}`;
		}

		return currentSession.session_label ?? currentSession.title ?? `Session ${sessionId}`;
	}

	function looksLikeUrl(value: string): boolean {
		return /^https?:\/\//i.test(value.trim());
	}

	function setSaving(dataId: EntityId, value: boolean) {
		savingIds = {
			...savingIds,
			[String(dataId)]: value,
		};
	}

	function setDeleting(dataId: EntityId, value: boolean) {
		deletingIds = {
			...deletingIds,
			[String(dataId)]: value,
		};
	}

	function setRecordPath(dataId: EntityId, value: string) {
		records = records.map((record) =>
			record.id === dataId
				? {
						...record,
						file_path: value,
					}
				: record,
		);
	}

	async function ensurePlanForSession(): Promise<EntityId | null> {
		if (session?.experiment_plan_id) {
			return session.experiment_plan_id;
		}

		if (!$currentUser || !session) {
			errorMessage = 'A signed-in researcher and an active session are required before adding experiment data.';
			return null;
		}
		if (session.subject_id === null || session.subject_id === undefined) {
			errorMessage = 'This session is not linked to a lobby, so a plan cannot be created yet.';
			return null;
		}

		isCreatingPlan = true;
		errorMessage = '';

		try {
			const createdPlan = await createExperimentPlan({
				subject_id: session.subject_id,
				owner_id: $currentUser.id,
				name: `${getSessionLabel(session)} Plan`,
				description: `Experiment data registry for session ${session.id}.`,
			});

			const updatedSession = await updateSession(session.id, {
				experiment_plan_id: createdPlan.id,
			});

			onSessionPatched(updatedSession);
			message = 'Created and linked an experiment plan so data URLs can be attached to this session.';
			return createdPlan.id;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Unable to create an experiment plan for experiment data.';
			return null;
		} finally {
			isCreatingPlan = false;
		}
	}

	async function loadExperimentData() {
		if (!session?.experiment_plan_id) {
			records = [];
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const response = await getExperimentData(session.experiment_plan_id);
			records = response.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load experiment data records.';
		} finally {
			isLoading = false;
		}
	}

	async function addRecord() {
		const planId = await ensurePlanForSession();
		if (!planId) {
			return;
		}

		if (!$currentUser) {
			errorMessage = 'A signed-in researcher is required before adding experiment data.';
			return;
		}

		if (!draftLocation.trim()) {
			errorMessage = 'Enter a URL or file location before adding a record.';
			return;
		}

		isCreating = true;
		errorMessage = '';
		message = '';

		try {
			const created = await createExperimentData({
				owner_id: $currentUser.id,
				file_path: draftLocation.trim(),
				experiment_plan: planId,
			});
			records = [...records, created];
			draftLocation = '';
			message = 'Added a new experiment data record.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to add the experiment data record.';
		} finally {
			isCreating = false;
		}
	}

	async function saveRecord(dataId: EntityId) {
		const target = records.find((record) => record.id === dataId);
		if (!target) {
			return;
		}

		if (!target.file_path.trim()) {
			errorMessage = 'The URL/path field cannot be empty.';
			return;
		}

		setSaving(dataId, true);
		errorMessage = '';
		message = '';

		try {
			const updated = await updateExperimentData(dataId, {
				file_path: target.file_path.trim(),
			});
			records = records.map((record) => (record.id === dataId ? updated : record));
			message = 'Updated the experiment data record.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to update the experiment data record.';
		} finally {
			setSaving(dataId, false);
		}
	}

	async function removeRecord(dataId: EntityId) {
		setDeleting(dataId, true);
		errorMessage = '';
		message = '';

		try {
			await deleteExperimentData(dataId);
			records = records.filter((record) => record.id !== dataId);
			message = 'Deleted the experiment data record.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to delete the experiment data record.';
		} finally {
			setDeleting(dataId, false);
		}
	}

	$effect(() => {
		const currentPlanId = session?.experiment_plan_id ?? null;
		void currentPlanId;
		void loadExperimentData();
	});
</script>

<section class="content-card data-links-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Experiment Data</p>
			<h3>External data locations</h3>
			<p class="page-copy">
				Register OneDrive URLs for now, and later reuse the same field for server URLs or other file locations.
			</p>
		</div>

		{#if !session?.experiment_plan_id}
			<button
				type="button"
				class="secondary-button dark-button"
				onclick={ensurePlanForSession}
				disabled={isCreatingPlan}
			>
				{isCreatingPlan ? 'Creating plan...' : 'Create plan for data'}
			</button>
		{/if}
	</div>

	{#if errorMessage}
		<p class="status-banner error">{errorMessage}</p>
	{/if}

	{#if message}
		<p class="status-banner">{message}</p>
	{/if}

	<div class="data-link-grid">
		<div class="data-link-composer">
			<div class="section-heading">
				<div>
					<p class="eyebrow">New Record</p>
					<h3>Add URL or file location</h3>
				</div>
			</div>

			<div class="form-grid data-link-form-grid">
				<label class="form-field form-field-full">
					<span>URL / path</span>
					<input
						type="text"
						placeholder="https://onedrive.live.com/... or future server path"
						value={draftLocation}
						oninput={(event) => {
							draftLocation = (event.currentTarget as HTMLInputElement).value;
						}}
					/>
				</label>
			</div>

			<div class="form-actions">
				<button type="button" class="primary-button" onclick={addRecord} disabled={isCreating || isLoading}>
					{isCreating ? 'Adding...' : 'Add data record'}
				</button>
			</div>
		</div>

		<div class="data-link-list-card">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Registry</p>
					<h3>{isLoading ? 'Loading records...' : `${records.length} data record${records.length === 1 ? '' : 's'}`}</h3>
				</div>
			</div>

			{#if !records.length && !isLoading}
				<p class="empty-state">No experiment data records yet.</p>
			{:else}
				<div class="data-link-list">
					{#each records as record}
						<div class="data-record-card">
							<div class="section-heading">
								<div>
									<p class="eyebrow">Record #{record.id}</p>
									<p class="record-meta">Owner {record.owner_id} · Added {record.create_at ? new Date(record.create_at).toLocaleString() : 'Pending'}</p>
								</div>
								{#if looksLikeUrl(record.file_path)}
									<a class="text-link" href={record.file_path} target="_blank" rel="noreferrer">Open</a>
								{/if}
							</div>

							<label class="form-field">
								<span>URL / path</span>
								<input
									type="text"
									value={record.file_path}
									oninput={(event) => setRecordPath(record.id, (event.currentTarget as HTMLInputElement).value)}
								/>
							</label>

							<div class="record-actions">
								<button
									type="button"
									class="primary-button"
									onclick={() => saveRecord(record.id)}
									disabled={savingIds[String(record.id)]}
								>
									{savingIds[String(record.id)] ? 'Saving...' : 'Save'}
								</button>
								<button
									type="button"
									class="secondary-button danger-button"
									onclick={() => removeRecord(record.id)}
									disabled={deletingIds[String(record.id)]}
								>
									{deletingIds[String(record.id)] ? 'Deleting...' : 'Delete'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
