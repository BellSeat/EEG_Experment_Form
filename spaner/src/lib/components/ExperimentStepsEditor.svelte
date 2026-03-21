<script lang="ts">
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { currentUser } from '$lib/auth';
	import {
		ApiError,
		createExperimentPlan,
		createExperimentStep,
		deleteExperimentStep,
		getExperimentPlanDetail,
		updateExperimentStep,
		updateSession,
	} from '$lib/api';
	import type { EntityId, ExperimentStep, Session } from '$lib/types';

	type SessionPatchedHandler = (session: Session) => void;

	type StepPreset = {
		id: string;
		label: string;
		duration_seconds: number;
		sets: number;
	};

	type StepEditorModel = {
		id: EntityId | `draft-${string}`;
		order_of_step: number;
		action_label: string;
		duration_seconds: number | null;
		sets: number | null;
	};

	type StepPayload = {
		label: string;
		duration_seconds: number | null;
		sets: number | null;
	};

	const PRESET_STORAGE_KEY = 'spaner.procedure-step-presets.v1';
	const DEFAULT_STEP_PRESETS: StepPreset[] = [
		{ id: 'relax', label: 'Relax', duration_seconds: 30, sets: 1 },
		{ id: 'finger-extend', label: 'Finger extend', duration_seconds: 5, sets: 10 },
		{ id: 'fist', label: 'Fist', duration_seconds: 5, sets: 10 },
		{ id: 'rest', label: 'Rest', duration_seconds: 10, sets: 1 },
	];

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
	let isPersistingChanges = $state(false);
	let isManagingPresets = $state(false);
	let message = $state('');
	let errorMessage = $state('');
	let exportMessage = $state('');
	let isExportPreviewExpanded = $state(false);
	let draggedStepId = $state<string | number | null>(null);
	let draftSequence = $state(0);
	let editingStepIds = $state<Record<string, boolean>>({});
	let persistedSteps = $state<StepEditorModel[]>([]);
	let steps = $state<StepEditorModel[]>([]);
	let stepPresets = $state<StepPreset[]>(DEFAULT_STEP_PRESETS);
	let editingPresetId = $state<string | null>(null);
	let presetDraft = $state<Pick<StepPreset, 'label' | 'duration_seconds' | 'sets'>>({
		label: '',
		duration_seconds: 10,
		sets: 1,
	});
	let draftStep = $state<StepEditorModel>({
		id: 'draft-0',
		order_of_step: 1,
		action_label: '',
		duration_seconds: null,
		sets: 1,
	});

	function getSessionLabel(currentSession: Session | null): string {
		if (!currentSession) {
			return `Session ${sessionId}`;
		}

		return currentSession.session_label ?? currentSession.title ?? `Session ${sessionId}`;
	}

	function nextDraftId(): `draft-${string}` {
		draftSequence += 1;
		return `draft-${Date.now()}-${draftSequence}`;
	}

	function nextPresetId(): string {
		draftSequence += 1;
		return `preset-${Date.now()}-${draftSequence}`;
	}

	function createEmptyDraft(nextOrder: number): StepEditorModel {
		return {
			id: nextDraftId(),
			order_of_step: nextOrder,
			action_label: '',
			duration_seconds: null,
			sets: 1,
		};
	}

	function cloneSteps(nextSteps: StepEditorModel[]): StepEditorModel[] {
		return nextSteps.map((step) => ({ ...step }));
	}

	function parsePositiveInteger(value: string): number | null {
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			return null;
		}
		return Math.floor(parsed);
	}

	function loadStepPresets() {
		if (!browser) {
			return;
		}

		try {
			const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
			if (!raw) {
				stepPresets = DEFAULT_STEP_PRESETS;
				return;
			}

			const parsed = JSON.parse(raw) as Partial<StepPreset>[];
			const normalized = parsed
				.map((preset, index) => ({
					id:
						typeof preset.id === 'string' && preset.id.trim()
							? preset.id
							: `preset-import-${index + 1}`,
					label: typeof preset.label === 'string' ? preset.label.trim() : '',
					duration_seconds:
						typeof preset.duration_seconds === 'number' && Number.isFinite(preset.duration_seconds)
							? Math.max(1, Math.floor(preset.duration_seconds))
							: 10,
					sets:
						typeof preset.sets === 'number' && Number.isFinite(preset.sets)
							? Math.max(1, Math.floor(preset.sets))
							: 1,
				}))
				.filter((preset) => preset.label);

			stepPresets = normalized.length ? normalized : DEFAULT_STEP_PRESETS;
		} catch {
			stepPresets = DEFAULT_STEP_PRESETS;
		}
	}

	function persistStepPresets() {
		if (!browser) {
			return;
		}

		window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(stepPresets));
	}

	function normalizeStepPayload(payload: Partial<StepPayload> | null | undefined): StepPayload {
		return {
			label: typeof payload?.label === 'string' ? payload.label : '',
			duration_seconds:
				typeof payload?.duration_seconds === 'number' && Number.isFinite(payload.duration_seconds)
					? Math.max(1, Math.floor(payload.duration_seconds))
					: null,
			sets:
				typeof payload?.sets === 'number' && Number.isFinite(payload.sets)
					? Math.max(1, Math.floor(payload.sets))
					: 1,
		};
	}

	function parseStepDescription(description: string): StepPayload {
		try {
			return normalizeStepPayload(JSON.parse(description) as Partial<StepPayload>);
		} catch {
			return {
				label: description,
				duration_seconds: null,
				sets: 1,
			};
		}
	}

	function serializeStep(step: StepEditorModel): string {
		return JSON.stringify({
			label: step.action_label.trim(),
			duration_seconds: step.duration_seconds,
			sets: step.sets ?? 1,
		});
	}

	function toEditorModel(step: ExperimentStep): StepEditorModel {
		const parsed = parseStepDescription(step.description);
		return {
			id: step.id,
			order_of_step: step.order_of_step,
			action_label: parsed.label,
			duration_seconds: parsed.duration_seconds,
			sets: parsed.sets,
		};
	}

	function resequence(nextSteps: StepEditorModel[]): StepEditorModel[] {
		return nextSteps.map((step, index) => ({
			...step,
			order_of_step: index + 1,
		}));
	}

	function isDraftStepId(stepId: EntityId | `draft-${string}`): boolean {
		return typeof stepId === 'string' && stepId.startsWith('draft-');
	}

	function buildComparableSteps(nextSteps: StepEditorModel[]) {
		return resequence(nextSteps).map((step) => ({
			id: isDraftStepId(step.id) ? null : step.id,
			order_of_step: step.order_of_step,
			action_label: step.action_label.trim(),
			duration_seconds: step.duration_seconds,
			sets: step.sets ?? 1,
		}));
	}

	function hasUnsavedChanges(): boolean {
		return (
			JSON.stringify(buildComparableSteps(steps)) !== JSON.stringify(buildComparableSteps(persistedSteps))
		);
	}

	function isEditing(stepId: EntityId): boolean {
		return editingStepIds[String(stepId)] ?? false;
	}

	function setEditing(stepId: EntityId, value: boolean) {
		editingStepIds = {
			...editingStepIds,
			[String(stepId)]: value,
		};
	}

	function formatDuration(value: number | null): string {
		if (value === null) {
			return 'No duration';
		}
		return `${value}s`;
	}

	function formatSets(value: number | null): string {
		return `${value ?? 1} set${(value ?? 1) === 1 ? '' : 's'}`;
	}

	function setDraftField(field: keyof Omit<StepEditorModel, 'id' | 'order_of_step'>, value: string) {
		if (field === 'duration_seconds' || field === 'sets') {
			draftStep = {
				...draftStep,
				[field]: parsePositiveInteger(value),
			};
			return;
		}

		draftStep = {
			...draftStep,
			[field]: value,
		};
	}

	function setStepField(stepId: EntityId, field: keyof Omit<StepEditorModel, 'id' | 'order_of_step'>, value: string) {
		steps = steps.map((step) => {
			if (step.id !== stepId) {
				return step;
			}

			if (field === 'duration_seconds' || field === 'sets') {
				return {
					...step,
					[field]: parsePositiveInteger(value),
				};
			}

			return {
				...step,
				[field]: value,
			};
		});
	}

	function applyPresetToDraft(preset: StepPreset) {
		draftStep = {
			...draftStep,
			action_label: preset.label,
			duration_seconds: preset.duration_seconds,
			sets: preset.sets,
		};
	}

	function resetPresetDraft() {
		presetDraft = {
			label: '',
			duration_seconds: 10,
			sets: 1,
		};
		editingPresetId = null;
	}

	function startPresetEdit(preset: StepPreset) {
		presetDraft = {
			label: preset.label,
			duration_seconds: preset.duration_seconds,
			sets: preset.sets,
		};
		editingPresetId = preset.id;
	}

	function setPresetDraftField(
		field: keyof Pick<StepPreset, 'label' | 'duration_seconds' | 'sets'>,
		value: string,
	) {
		if (field === 'duration_seconds' || field === 'sets') {
			presetDraft = {
				...presetDraft,
				[field]: parsePositiveInteger(value) ?? 1,
			};
			return;
		}

		presetDraft = {
			...presetDraft,
			[field]: value,
		};
	}

	function savePreset() {
		const label = presetDraft.label.trim();
		if (!label) {
			errorMessage = 'Preset label is required.';
			return;
		}

		errorMessage = '';
		message = '';

		if (editingPresetId) {
			stepPresets = stepPresets.map((preset) =>
				preset.id === editingPresetId
					? {
							...preset,
							label,
							duration_seconds: presetDraft.duration_seconds,
							sets: presetDraft.sets,
						}
					: preset,
			);
			message = `Updated preset ${label}.`;
		} else {
			stepPresets = [
				...stepPresets,
				{
					id: nextPresetId(),
					label,
					duration_seconds: presetDraft.duration_seconds,
					sets: presetDraft.sets,
				},
			];
			message = `Added preset ${label}.`;
		}

		persistStepPresets();
		resetPresetDraft();
	}

	function deletePreset(presetId: string) {
		const preset = stepPresets.find((entry) => entry.id === presetId);
		stepPresets = stepPresets.filter((entry) => entry.id !== presetId);
		persistStepPresets();
		if (editingPresetId === presetId) {
			resetPresetDraft();
		}
		message = preset ? `Deleted preset ${preset.label}.` : 'Deleted preset.';
		errorMessage = '';
	}

	async function ensurePlanForSession(): Promise<EntityId | null> {
		if (session?.experiment_plan_id) {
			return session.experiment_plan_id;
		}

		if (!$currentUser || !session) {
			errorMessage = 'A signed-in researcher and an active session are required before saving procedure steps.';
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
				description: `Procedure steps for session ${session.id}.`,
			});

			const updatedSession = await updateSession(session.id, {
				experiment_plan_id: createdPlan.id,
			});

			onSessionPatched(updatedSession);
			message = 'Created and linked an experiment plan so procedure steps can be stored.';
			return createdPlan.id;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Unable to create an experiment plan for this session.';
			return null;
		} finally {
			isCreatingPlan = false;
		}
	}

	async function loadSteps(planId: EntityId | null | undefined = session?.experiment_plan_id) {
		if (!planId) {
			persistedSteps = [];
			steps = [];
			editingStepIds = {};
			draftStep = createEmptyDraft(1);
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const detail = await getExperimentPlanDetail(planId);
			const loadedSteps = resequence(detail.steps.map(toEditorModel));
			persistedSteps = cloneSteps(loadedSteps);
			steps = cloneSteps(loadedSteps);
			editingStepIds = {};
			draftStep = createEmptyDraft(loadedSteps.length + 1);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				errorMessage = 'Experiment steps endpoints are not available in FastAPI yet.';
			} else {
				errorMessage = error instanceof Error ? error.message : 'Unable to load procedure steps.';
			}
		} finally {
			isLoading = false;
		}
	}

	function addStepLocally() {
		if (!draftStep.action_label.trim()) {
			errorMessage = 'Action label is required.';
			return;
		}

		errorMessage = '';
		message = '';
		steps = resequence([
			...steps,
			{
				...draftStep,
				id: nextDraftId(),
			},
		]);
		editingStepIds = {};
		draftStep = createEmptyDraft(steps.length + 1);
		message = 'Added a local step. Confirm changes when you are ready to update the database.';
	}

	function removeStepLocally(stepId: EntityId) {
		steps = resequence(steps.filter((step) => step.id !== stepId));
		setEditing(stepId, false);
		draftStep = createEmptyDraft(steps.length + 1);
		message = 'Removed the step locally. Confirm changes to sync the database.';
		errorMessage = '';
	}

	function moveStepLocally(stepId: EntityId, direction: -1 | 1) {
		const index = steps.findIndex((step) => step.id === stepId);
		const nextIndex = index + direction;
		if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) {
			return;
		}

		const nextSteps = [...steps];
		const [moved] = nextSteps.splice(index, 1);
		nextSteps.splice(nextIndex, 0, moved);
		steps = resequence(nextSteps);
		editingStepIds = {};
		message = 'Reordered steps locally. Confirm changes to sync the database.';
		errorMessage = '';
	}

	function handleDragStart(stepId: EntityId) {
		draggedStepId = stepId;
	}

	function handleDrop(targetStepId: EntityId) {
		if (draggedStepId === null || draggedStepId === targetStepId) {
			draggedStepId = null;
			return;
		}

		const currentIndex = steps.findIndex((step) => step.id === draggedStepId);
		const targetIndex = steps.findIndex((step) => step.id === targetStepId);
		if (currentIndex < 0 || targetIndex < 0) {
			draggedStepId = null;
			return;
		}

		const nextSteps = [...steps];
		const [moved] = nextSteps.splice(currentIndex, 1);
		nextSteps.splice(targetIndex, 0, moved);
		steps = resequence(nextSteps);
		editingStepIds = {};
		draggedStepId = null;
		message = 'Reordered steps locally. Confirm changes to sync the database.';
		errorMessage = '';
	}

	function discardLocalChanges() {
		steps = cloneSteps(persistedSteps);
		editingStepIds = {};
		draftStep = createEmptyDraft(steps.length + 1);
		message = 'Discarded unsaved step edits.';
		errorMessage = '';
	}

	async function saveChangesToDatabase() {
		if (steps.some((step) => !step.action_label.trim())) {
			errorMessage = 'Every step needs an action label before saving.';
			return;
		}

		if (!hasUnsavedChanges()) {
			message = 'No local step changes to save.';
			errorMessage = '';
			return;
		}

		const planId = await ensurePlanForSession();
		if (!planId) {
			return;
		}

		isPersistingChanges = true;
		errorMessage = '';
		message = '';

		try {
			const nextSteps = resequence(steps);
			const persistedById = new Map(
				persistedSteps
					.filter((step) => !isDraftStepId(step.id))
					.map((step) => [step.id, step]),
			);
			const nextPersistedIds = new Set(
				nextSteps.filter((step) => !isDraftStepId(step.id)).map((step) => step.id),
			);

			const toDelete = persistedSteps.filter(
				(step) => !isDraftStepId(step.id) && !nextPersistedIds.has(step.id),
			);
			const toCreate = nextSteps.filter((step) => isDraftStepId(step.id));
			const toUpdate = nextSteps.filter((step) => {
				if (isDraftStepId(step.id)) {
					return false;
				}

				const previous = persistedById.get(step.id);
				if (!previous) {
					return true;
				}

				return (
					previous.order_of_step !== step.order_of_step ||
					previous.action_label.trim() !== step.action_label.trim() ||
					previous.duration_seconds !== step.duration_seconds ||
					(previous.sets ?? 1) !== (step.sets ?? 1)
				);
			});

			for (const step of toDelete) {
				await deleteExperimentStep(step.id);
			}

			for (const step of toUpdate) {
				await updateExperimentStep(step.id, {
					order_of_step: step.order_of_step,
					description: serializeStep(step),
				});
			}

			for (const step of toCreate) {
				await createExperimentStep({
					experiment_id: planId,
					order_of_step: step.order_of_step,
					description: serializeStep(step),
				});
			}

			await loadSteps();
			message = 'Confirmed the step table and updated the database.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to save procedure steps.';
		} finally {
			isPersistingChanges = false;
		}
	}

	function buildExportPayload() {
		return {
			export_format: 'procedure_steps.v1',
			generated_at: new Date().toISOString(),
			session: {
				id: session?.id ?? sessionId,
				label: getSessionLabel(session),
				experiment_plan_id: session?.experiment_plan_id ?? null,
			},
			steps: resequence(steps).map((step) => ({
				order: step.order_of_step,
				action: step.action_label.trim(),
				duration_seconds: step.duration_seconds,
				sets: step.sets ?? 1,
			})),
		};
	}

	function getExportJson(): string {
		return JSON.stringify(buildExportPayload(), null, 2);
	}

	async function copyExportJson() {
		try {
			await navigator.clipboard.writeText(getExportJson());
			exportMessage = 'Copied procedure steps JSON.';
		} catch {
			exportMessage = 'Unable to copy JSON automatically on this browser.';
		}
	}

	function downloadExportJson() {
		const fileName = `${getSessionLabel(session).replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'session'}_procedure_steps.json`;
		const blob = new Blob([getExportJson()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
		exportMessage = `Downloaded ${fileName}.`;
	}

	$effect(() => {
		const currentSessionId = session?.id ?? sessionId;
		const currentPlanId = session?.experiment_plan_id ?? null;
		void currentSessionId;
		untrack(() => {
			void loadSteps(currentPlanId);
		});
	});

	loadStepPresets();
</script>

<section class="content-card procedure-steps-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Procedure Steps</p>
			<h3>Session action sequence</h3>
			<p class="page-copy">
				Edit the whole step table locally first. The database is updated only after you confirm the table.
			</p>
		</div>
		{#if !session?.experiment_plan_id}
			<button
				type="button"
				class="secondary-button dark-button"
				onclick={ensurePlanForSession}
				disabled={isCreatingPlan || isPersistingChanges}
			>
				{isCreatingPlan ? 'Creating plan...' : 'Create plan for steps'}
			</button>
		{/if}
	</div>

	{#if errorMessage}
		<p class="status-banner error">{errorMessage}</p>
	{/if}

	{#if message}
		<p class="status-banner">{message}</p>
	{/if}

	{#if exportMessage}
		<p class="status-banner">{exportMessage}</p>
	{/if}

	{#if hasUnsavedChanges()}
		<p class="status-banner">You have local step edits that are not in the database yet.</p>
	{/if}

	<div class="steps-layout">
		<div class="step-composer">
			<div class="section-heading">
				<div>
					<p class="eyebrow">New Step</p>
					<h3>Add one procedure step</h3>
				</div>
				<div class="toolbar-group">
					<button
						type="button"
						class="secondary-button soft-button"
						onclick={() => {
							isManagingPresets = !isManagingPresets;
							if (!isManagingPresets) {
								resetPresetDraft();
							}
						}}
					>
						{isManagingPresets ? 'Done managing tags' : 'Manage tags'}
					</button>
				</div>
			</div>

			<div class="step-preset-row">
				{#each stepPresets as preset}
					<div class="step-preset-chip">
						<button
							type="button"
							class="secondary-button soft-button"
							onclick={() => applyPresetToDraft(preset)}
						>
							{preset.label}
						</button>
						{#if isManagingPresets}
							<div class="step-preset-actions">
								<button type="button" class="link-button" onclick={() => startPresetEdit(preset)}>
									Edit
								</button>
								<button type="button" class="link-button" onclick={() => deletePreset(preset.id)}>
									Delete
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if isManagingPresets}
				<div class="preset-editor-card">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Preset Tags</p>
							<h3>{editingPresetId ? 'Update preset tag' : 'Add preset tag'}</h3>
						</div>
					</div>

					<div class="form-grid step-form-grid">
						<label class="form-field">
							<span>Tag label</span>
							<input
								type="text"
								placeholder="Relax"
								value={presetDraft.label}
								oninput={(event) => setPresetDraftField('label', (event.currentTarget as HTMLInputElement).value)}
							/>
						</label>

						<label class="form-field">
							<span>Duration (seconds)</span>
							<input
								type="number"
								min="1"
								value={presetDraft.duration_seconds}
								oninput={(event) =>
									setPresetDraftField('duration_seconds', (event.currentTarget as HTMLInputElement).value)}
							/>
						</label>

						<label class="form-field">
							<span>Repeat sets</span>
							<input
								type="number"
								min="1"
								value={presetDraft.sets}
								oninput={(event) => setPresetDraftField('sets', (event.currentTarget as HTMLInputElement).value)}
							/>
						</label>
					</div>

					<div class="form-actions">
						{#if editingPresetId}
							<button type="button" class="secondary-button soft-button" onclick={resetPresetDraft}>
								Cancel
							</button>
						{/if}
						<button type="button" class="primary-button" onclick={savePreset}>
							{editingPresetId ? 'Update tag' : '+ Add tag'}
						</button>
					</div>
				</div>
			{/if}

			<div class="form-grid step-form-grid">
				<label class="form-field">
					<span>Action</span>
					<input
						type="text"
						placeholder="Relax, finger extend, fist..."
						value={draftStep.action_label}
						oninput={(event) => setDraftField('action_label', (event.currentTarget as HTMLInputElement).value)}
					/>
				</label>

				<label class="form-field">
					<span>Duration (seconds)</span>
					<input
						type="number"
						min="1"
						placeholder="10"
						value={draftStep.duration_seconds ?? ''}
						oninput={(event) => setDraftField('duration_seconds', (event.currentTarget as HTMLInputElement).value)}
					/>
				</label>

				<label class="form-field">
					<span>Repeat sets</span>
					<input
						type="number"
						min="1"
						placeholder="1"
						value={draftStep.sets ?? 1}
						oninput={(event) => setDraftField('sets', (event.currentTarget as HTMLInputElement).value)}
					/>
				</label>
			</div>

			<div class="form-actions">
				<button type="button" class="primary-button" onclick={addStepLocally} disabled={isPersistingChanges || isLoading}>
					+ Add locally
				</button>
			</div>
		</div>

		<div class="step-list-card">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Sequence</p>
					<h3>{isLoading ? 'Loading steps...' : `${steps.length} planned step${steps.length === 1 ? '' : 's'}`}</h3>
					<p class="page-copy">
						Drag cards to reorder, use the arrow controls for precise movement, then confirm the table to save.
					</p>
				</div>
				<div class="toolbar-group">
					<button
						type="button"
						class="secondary-button soft-button"
						onclick={discardLocalChanges}
						disabled={!hasUnsavedChanges() || isPersistingChanges}
					>
						Discard local edits
					</button>
					<button
						type="button"
						class="primary-button"
						onclick={saveChangesToDatabase}
						disabled={!hasUnsavedChanges() || isPersistingChanges || isLoading}
					>
						{isPersistingChanges ? 'Saving table...' : 'Confirm and save'}
					</button>
				</div>
			</div>

			{#if !steps.length && !isLoading}
				<p class="empty-state">No procedure steps yet. Add one above to start planning the session flow.</p>
			{:else}
				<div class="step-list" role="list">
					{#each steps as step, index (step.id)}
						<div
							class:editing-card={isEditing(step.id)}
							class="step-card"
							role="listitem"
							draggable={!isPersistingChanges}
							ondragstart={() => handleDragStart(step.id)}
							ondragover={(event) => event.preventDefault()}
							ondrop={() => handleDrop(step.id)}
						>
							<div class="step-card-header">
								<div class="step-order-block">
									<span class="step-order-badge">#{step.order_of_step}</span>
									<button type="button" class="drag-handle" aria-label={`Drag step ${step.order_of_step}`}>
										Drag
									</button>
								</div>

								<div class="step-card-actions">
									{#if index > 0}
										<button
											type="button"
											class="secondary-button soft-button"
											onclick={() => moveStepLocally(step.id, -1)}
											disabled={isPersistingChanges}
										>
											Up
										</button>
									{/if}
									{#if index < steps.length - 1}
										<button
											type="button"
											class="secondary-button soft-button"
											onclick={() => moveStepLocally(step.id, 1)}
											disabled={isPersistingChanges}
										>
											Down
										</button>
									{/if}
									<button
										type="button"
										class="secondary-button soft-button"
										onclick={() => setEditing(step.id, !isEditing(step.id))}
										disabled={isPersistingChanges}
									>
										{isEditing(step.id) ? 'Done' : 'Edit'}
									</button>
								</div>
							</div>

							<div class="step-summary-grid">
								<div class="step-summary-item step-summary-primary">
									<span>Action</span>
									<strong>{step.action_label || 'Untitled step'}</strong>
								</div>
								<div class="step-summary-item">
									<span>Duration</span>
									<strong>{formatDuration(step.duration_seconds)}</strong>
								</div>
								<div class="step-summary-item">
									<span>Sets</span>
									<strong>{formatSets(step.sets)}</strong>
								</div>
							</div>

							{#if isEditing(step.id)}
								<div class="form-grid step-form-grid">
									<label class="form-field">
										<span>Action</span>
										<input
											type="text"
											value={step.action_label}
											oninput={(event) =>
												setStepField(step.id, 'action_label', (event.currentTarget as HTMLInputElement).value)}
										/>
									</label>

									<label class="form-field">
										<span>Duration (seconds)</span>
										<input
											type="number"
											min="1"
											value={step.duration_seconds ?? ''}
											oninput={(event) =>
												setStepField(step.id, 'duration_seconds', (event.currentTarget as HTMLInputElement).value)}
										/>
									</label>

									<label class="form-field">
										<span>Repeat sets</span>
										<input
											type="number"
											min="1"
											value={step.sets ?? 1}
											oninput={(event) => setStepField(step.id, 'sets', (event.currentTarget as HTMLInputElement).value)}
										/>
									</label>
								</div>

								<div class="step-row-actions">
									<button
										type="button"
										class="secondary-button danger-button"
										onclick={() => removeStepLocally(step.id)}
										disabled={isPersistingChanges}
									>
										Remove
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<div class="export-card">
				<div class="section-heading">
					<div>
						<p class="eyebrow">Export Mode</p>
						<h3>Procedure JSON</h3>
					</div>
					<div class="toolbar-group">
						<button
							type="button"
							class="secondary-button soft-button"
							onclick={() => (isExportPreviewExpanded = !isExportPreviewExpanded)}
						>
							{isExportPreviewExpanded ? 'Hide preview' : 'Show preview'}
						</button>
						<button type="button" class="secondary-button soft-button" onclick={copyExportJson} disabled={!steps.length}>
							Copy JSON
						</button>
						<button type="button" class="secondary-button dark-button" onclick={downloadExportJson} disabled={!steps.length}>
							Download JSON
						</button>
					</div>
				</div>
				{#if isExportPreviewExpanded}
					<pre class="json-preview">{getExportJson()}</pre>
				{/if}
			</div>
		</div>
	</div>
</section>
