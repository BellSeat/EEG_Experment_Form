<script lang="ts">
	import { currentUser } from '$lib/auth';
	import {
		ApiError,
		createEegMap,
		createExperimentPlan,
		getEegMap,
		getExperimentPlanDetail,
		updateEegMap,
		updateExperimentPlan,
		updateSession,
	} from '$lib/api';
	import {
		EEG_8_CHANNEL_CODES,
		EEG_16_CHANNEL_CODES,
		EEG_LAYOUT_POINTS,
		EEG_SPECIAL_CHANNEL_CODES,
		applyMontagePreset,
		createEmptyEegMapDraft,
		findDuplicateChannelNumbers,
		mergeEegMapChannels,
		sortChannels,
	} from '$lib/eeg-map';
	import type { EegMap, EegMapChannel, ExperimentPlan, Session } from '$lib/types';

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

	let isLoadingPlan = $state(false);
	let isCreatingPlan = $state(false);
	let isSavingMap = $state(false);
	let showUnmappedRows = $state(false);
	let planError = $state('');
	let planMessage = $state('');
	let exportMessage = $state('');
	let selectedElectrodeCode = $state('Cz');
	let experimentPlan = $state<ExperimentPlan | null>(null);
	let eegMapDraft = $state<EegMap>(createEmptyEegMapDraft());

	function getSessionLabel(currentSession: Session | null): string {
		if (!currentSession) {
			return `Session ${sessionId}`;
		}

		return currentSession.session_label ?? currentSession.title ?? `Session ${sessionId}`;
	}

	function isSpecialChannel(code: string): boolean {
		return EEG_SPECIAL_CHANNEL_CODES.includes(code as (typeof EEG_SPECIAL_CHANNEL_CODES)[number]);
	}

	function getChannelValue(electrodeCode: string): EegMapChannel {
		return (
			eegMapDraft.channels.find((channel) => channel.electrode_code === electrodeCode) ?? {
				electrode_code: electrodeCode,
				channel_number: null,
				display_order: 999,
			}
		);
	}

	function getSelectedChannel(): EegMapChannel {
		return getChannelValue(selectedElectrodeCode);
	}

	function setChannelNumber(electrodeCode: string, value: string) {
		const parsed = value.trim() === '' ? null : Number(value);
		const nextValue = parsed !== null && Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;

		eegMapDraft.channels = eegMapDraft.channels.map((channel) =>
			channel.electrode_code === electrodeCode
				? {
						...channel,
						channel_number: nextValue,
					}
				: channel,
		);
	}

	function setMapName(value: string) {
		eegMapDraft.name = value;
	}

	function setMapDescription(value: string) {
		eegMapDraft.description = value;
	}

	function selectElectrode(code: string) {
		selectedElectrodeCode = code;
	}

	function applyPreset(codes: readonly string[], label: string) {
		eegMapDraft.channels = applyMontagePreset(eegMapDraft.channels, codes, true);
		planMessage = `Applied the ${label} montage. Add REF and BIAS separately when needed.`;
		planError = '';
	}

	function clearAllChannels() {
		eegMapDraft.channels = eegMapDraft.channels.map((channel) => ({
			...channel,
			channel_number: null,
		}));
		planMessage = 'Cleared all scalp, REF, and BIAS assignments from the current draft.';
		planError = '';
	}

	function getDuplicateChannelNumbers(): number[] {
		return findDuplicateChannelNumbers(eegMapDraft.channels);
	}

	function getMappedScalpChannelCount(): number {
		return eegMapDraft.channels.filter(
			(channel) => !isSpecialChannel(channel.electrode_code) && channel.channel_number !== null,
		).length;
	}

	function getMappedAuxChannelCount(): number {
		return eegMapDraft.channels.filter(
			(channel) => isSpecialChannel(channel.electrode_code) && channel.channel_number !== null,
		).length;
	}

	function getVisibleChannels(): EegMapChannel[] {
		return sortChannels(eegMapDraft.channels).filter((channel) => {
			if (showUnmappedRows) {
				return true;
			}

			return channel.channel_number !== null || isSpecialChannel(channel.electrode_code);
		});
	}

	function handleElectrodeKeydown(event: KeyboardEvent, code: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectElectrode(code);
		}
	}

	async function loadExperimentPlan() {
		if (!session?.experiment_plan_id) {
			experimentPlan = null;
			eegMapDraft = createEmptyEegMapDraft(`${getSessionLabel(session)} EEG Map`);
			return;
		}

		isLoadingPlan = true;
		planError = '';

		try {
			const detail = await getExperimentPlanDetail(session.experiment_plan_id);
			experimentPlan = detail.plan;

			if (detail.eeg_map) {
				eegMapDraft = mergeEegMapChannels(detail.eeg_map);
			} else if (detail.plan.eeg_map_id) {
				eegMapDraft = mergeEegMapChannels(await getEegMap(detail.plan.eeg_map_id));
			} else {
				eegMapDraft = createEmptyEegMapDraft(`${getSessionLabel(session)} EEG Map`);
			}
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				planError =
					'Experiment plan detail loaded, but EEG map endpoints are not available in FastAPI yet. The editor is ready once the backend is updated.';
			} else {
				planError =
					error instanceof Error ? error.message : 'Unable to load experiment plan information for this session.';
			}
			eegMapDraft = createEmptyEegMapDraft(`${getSessionLabel(session)} EEG Map`);
		} finally {
			isLoadingPlan = false;
		}
	}

	async function createPlanForSession() {
		if (!session || !$currentUser) {
			planError = 'A signed-in researcher is required before creating an experiment plan.';
			return;
		}

		isCreatingPlan = true;
		planError = '';
		planMessage = '';

		try {
			const createdPlan = await createExperimentPlan({
				owner_id: $currentUser.id,
				name: `${getSessionLabel(session)} Plan`,
				description: `EEG experiment plan for session ${session.id}.`,
			});

			const updatedSession = await updateSession(session.id, {
				experiment_plan_id: createdPlan.id,
			});

			experimentPlan = createdPlan;
			onSessionPatched(updatedSession);
			eegMapDraft = createEmptyEegMapDraft(`${getSessionLabel(updatedSession)} EEG Map`);
			planMessage = 'Created a linked experiment plan for this session.';
		} catch (error) {
			planError =
				error instanceof Error ? error.message : 'Unable to create and attach an experiment plan right now.';
		} finally {
			isCreatingPlan = false;
		}
	}

	function buildMapPayload() {
		return {
			name: eegMapDraft.name,
			layout_type: eegMapDraft.layout_type,
			description: eegMapDraft.description,
			channels: sortChannels(eegMapDraft.channels),
		};
	}

	function buildExportPayload() {
		return {
			export_format: 'eeg_channel_alignment.v1',
			generated_at: new Date().toISOString(),
			session: {
				id: session?.id ?? sessionId,
				label: getSessionLabel(session),
				experiment_plan_id: session?.experiment_plan_id ?? null,
			},
			eeg_map: {
				name: eegMapDraft.name,
				layout_type: eegMapDraft.layout_type,
				description: eegMapDraft.description ?? null,
				channels: sortChannels(eegMapDraft.channels).map((channel) => ({
					electrode_code: channel.electrode_code,
					channel_number: channel.channel_number,
					display_order: channel.display_order,
				})),
			},
		};
	}

	function getExportJson(): string {
		return JSON.stringify(buildExportPayload(), null, 2);
	}

	async function copyExportJson() {
		try {
			await navigator.clipboard.writeText(getExportJson());
			exportMessage = 'Copied EEG channel alignment JSON.';
		} catch {
			exportMessage = 'Unable to copy EEG map JSON automatically on this browser.';
		}
	}

	function downloadExportJson() {
		const fileName = `${getSessionLabel(session).replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'session'}_eeg_channel_alignment.json`;
		const blob = new Blob([getExportJson()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
		exportMessage = `Downloaded ${fileName}.`;
	}

	async function savePlan() {
		if (!experimentPlan) {
			await createPlanForSession();
			if (!experimentPlan) {
				return;
			}
		}

		const duplicateChannelNumbers = getDuplicateChannelNumbers();
		if (duplicateChannelNumbers.length > 0) {
			planError = `Channel numbers must be unique. Duplicates found: ${duplicateChannelNumbers.join(', ')}.`;
			return;
		}

		isSavingMap = true;
		planError = '';
		planMessage = '';

		try {
			if (experimentPlan.eeg_map_id) {
				const savedMap = await updateEegMap(experimentPlan.eeg_map_id, buildMapPayload());
				eegMapDraft = mergeEegMapChannels(savedMap);
			} else {
				const createdMap = await createEegMap(buildMapPayload());
				const updatedPlan = await updateExperimentPlan(experimentPlan.id, {
					eeg_map_id: createdMap.id,
				});
				experimentPlan = updatedPlan;
				eegMapDraft = mergeEegMapChannels(createdMap);
			}

			planMessage = 'Saved the EEG map to the backend contract successfully.';
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				planError =
					'FastAPI still needs the `eeg_maps` table and `/eeg-maps` endpoints. The frontend is ready for that contract.';
			} else {
				planError = error instanceof Error ? error.message : 'Unable to save the EEG map.';
			}
		} finally {
			isSavingMap = false;
		}
	}

	$effect(() => {
		void loadExperimentPlan();
	});
</script>

<section class="content-card eeg-plan-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Experiment Plan</p>
			<h3>EEG channel alignment</h3>
			<p class="page-copy">
				Map each scalp electrode to its actual acquisition channel. `REF` and `BIAS` are tracked separately
				and saved with the same plan. Electrode positions now follow a standard montage projection, while the
				head outline remains a schematic top view.
			</p>
		</div>

		<div class="toolbar-group">
			{#if !session?.experiment_plan_id}
				<button
					type="button"
					class="secondary-button dark-button"
					onclick={createPlanForSession}
					disabled={isCreatingPlan}
				>
					{isCreatingPlan ? 'Creating plan...' : 'Create plan'}
				</button>
			{/if}
			<button type="button" class="secondary-button soft-button" onclick={() => applyPreset(EEG_8_CHANNEL_CODES, '8-channel')}>
				Use 8-channel preset
			</button>
			<button
				type="button"
				class="secondary-button soft-button"
				onclick={() => applyPreset(EEG_16_CHANNEL_CODES, '16-channel')}
			>
				Use 16-channel preset
			</button>
			<button type="button" class="secondary-button soft-button" onclick={clearAllChannels}>
				Clear map
			</button>
			<button type="button" class="primary-button" onclick={savePlan} disabled={isSavingMap || isLoadingPlan}>
				{isSavingMap ? 'Saving...' : 'Save EEG map'}
			</button>
		</div>
	</div>

	{#if planError}
		<p class="status-banner error">{planError}</p>
	{/if}

	{#if planMessage}
		<p class="status-banner">{planMessage}</p>
	{/if}

	{#if exportMessage}
		<p class="status-banner">{exportMessage}</p>
	{/if}

	<div class="plan-summary">
		<div class="plan-stat">
			<span>Session</span>
			<strong>{getSessionLabel(session)}</strong>
		</div>
		<div class="plan-stat">
			<span>Plan ID</span>
			<strong>{experimentPlan?.id ?? 'Not linked yet'}</strong>
		</div>
		<div class="plan-stat">
			<span>Scalp channels</span>
			<strong>{getMappedScalpChannelCount()} / 8 or 16</strong>
		</div>
		<div class="plan-stat">
			<span>REF / BIAS</span>
			<strong>{getMappedAuxChannelCount()} / {EEG_SPECIAL_CHANNEL_CODES.length}</strong>
		</div>
		<div class="plan-stat">
			<span>Duplicate channels</span>
			<strong>{getDuplicateChannelNumbers().length}</strong>
		</div>
	</div>

	<div class="eeg-workbench">
		<div class="eeg-canvas-panel">
			<div class="map-header">
				<div>
					<label class="field-caption" for="map-name">Map name</label>
					<input
						id="map-name"
						class="inline-input"
						value={eegMapDraft.name}
						oninput={(event) => setMapName((event.currentTarget as HTMLInputElement).value)}
					/>
				</div>

				<div>
					<label class="field-caption" for="map-description">Description</label>
					<input
						id="map-description"
						class="inline-input"
						value={eegMapDraft.description ?? ''}
						oninput={(event) => setMapDescription((event.currentTarget as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<div class="eeg-map-stage">
				<svg
					viewBox="12 22 496 640"
					preserveAspectRatio="xMidYMid meet"
					class="eeg-map"
					role="img"
					aria-label="EEG electrode map editor"
				>
					<title>Interactive EEG electrode map</title>
					<g transform="translate(0 10)">
						<circle cx="260" cy="328" r="242" class="head-outline" />
						<path d="M216 56 C226 20 294 20 304 56" class="nose-outline" />
						<path d="M32 332 C16 314 16 384 32 398 C48 412 60 400 66 388" class="ear-outline" />
						<path d="M488 332 C504 314 504 384 488 398 C472 412 460 400 454 388" class="ear-outline" />
						<circle cx="260" cy="328" r="182" class="guide-ring" />

						{#each EEG_LAYOUT_POINTS as point}
							{@const channel = getChannelValue(point.code)}
							{@const isSelected = selectedElectrodeCode === point.code}
							{@const isMapped = channel.channel_number !== null}
							<g
								class="electrode-group"
								role="button"
								tabindex="0"
								aria-label={`Electrode ${point.code}`}
								onclick={() => selectElectrode(point.code)}
								onkeydown={(event) => handleElectrodeKeydown(event, point.code)}
							>
								<circle
									cx={point.x}
									cy={point.y}
									r={point.radius ?? 21}
									class:selected={isSelected}
									class:mapped={isMapped}
									class:electrode-node={true}
								/>
								<text x={point.x} y={point.y - (isMapped ? 5 : 1)} class="electrode-label">{point.code}</text>
								{#if isMapped}
									<text x={point.x} y={point.y + 13} class="channel-label">CH {channel.channel_number}</text>
								{/if}
							</g>
						{/each}
					</g>
				</svg>
			</div>

			<p class="map-footnote">
				Coordinates are projected from a standard 10-05 spherical montage and rendered as the 10-10 / 10-20
				subset used by this page. The head shape is still schematic, so the electrode label remains the
				authoritative mapping key.
			</p>
		</div>

		<aside class="eeg-inspector">
			<div class="inspector-card">
				<p class="eyebrow">{isSpecialChannel(selectedElectrodeCode) ? 'Aux Channel' : 'Selected Electrode'}</p>
				<h4>{selectedElectrodeCode}</h4>
				<p>
					{#if isSpecialChannel(selectedElectrodeCode)}
						Assign the acquisition channel used as {selectedElectrodeCode}. This value is stored with the EEG map.
					{:else}
						Click a node on the map or edit the summary below. Both views stay in sync.
					{/if}
				</p>

				<label class="field-caption" for="selected-channel">Channel number</label>
				<input
					id="selected-channel"
					class="inspector-input"
					type="number"
					min="1"
					placeholder="Enter channel"
					value={getSelectedChannel().channel_number ?? ''}
					oninput={(event) => setChannelNumber(selectedElectrodeCode, (event.currentTarget as HTMLInputElement).value)}
				/>

				<div class="inspector-actions">
					<button
						type="button"
						class="secondary-button soft-button"
						onclick={() => setChannelNumber(selectedElectrodeCode, '')}
					>
						Clear selection
					</button>
				</div>
			</div>

			<div class="inspector-card">
				<p class="eyebrow">Aux Channels</p>
				<h4>REF and BIAS</h4>
				<p>These two channels stay outside the scalp diagram but save with the same experiment plan.</p>

				<div class="aux-grid">
					{#each EEG_SPECIAL_CHANNEL_CODES as code}
						<div class="aux-channel-row">
							<button type="button" class="link-button" onclick={() => selectElectrode(code)}>{code}</button>
							<input
								class="table-input"
								type="number"
								min="1"
								placeholder={`Set ${code}`}
								value={getChannelValue(code).channel_number ?? ''}
								oninput={(event) => setChannelNumber(code, (event.currentTarget as HTMLInputElement).value)}
							/>
							<button type="button" class="secondary-button soft-button" onclick={() => setChannelNumber(code, '')}>
								Clear
							</button>
						</div>
					{/each}
				</div>
			</div>
		</aside>
	</div>

	<div class="mapping-table-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Mapping Table</p>
				<h3>Electrode to channel summary</h3>
				<p class="page-copy mapping-table-copy">
					By default this stays focused on assigned channels plus REF and BIAS. Turn on the full list when you
					want to browse every electrode.
				</p>
			</div>

			<label class="toggle-inline">
				<input type="checkbox" bind:checked={showUnmappedRows} />
				<span>Show all electrodes</span>
			</label>
		</div>

		<div class="table-wrap">
			<table class="data-table eeg-table">
				<thead>
					<tr>
						<th>Electrode</th>
						<th>Channel</th>
					</tr>
				</thead>
				<tbody>
					{#each getVisibleChannels() as channel}
						<tr class:selected-row={selectedElectrodeCode === channel.electrode_code}>
							<td>
								<button type="button" class="link-button" onclick={() => selectElectrode(channel.electrode_code)}>
									{channel.electrode_code}
								</button>
							</td>
							<td>
								<input
									class="table-input"
									type="number"
									min="1"
									placeholder="Unassigned"
									value={channel.channel_number ?? ''}
									oninput={(event) =>
										setChannelNumber(channel.electrode_code, (event.currentTarget as HTMLInputElement).value)}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="export-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Export Mode</p>
				<h3>EEG channel alignment JSON</h3>
			</div>
			<div class="toolbar-group">
				<button type="button" class="secondary-button soft-button" onclick={copyExportJson}>
					Copy JSON
				</button>
				<button type="button" class="secondary-button dark-button" onclick={downloadExportJson}>
					Download JSON
				</button>
			</div>
		</div>
		<pre class="json-preview">{getExportJson()}</pre>
	</div>
</section>
