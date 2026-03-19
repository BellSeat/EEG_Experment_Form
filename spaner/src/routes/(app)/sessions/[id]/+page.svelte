<script lang="ts">
	import { onMount } from 'svelte';
	import EegPlanEditor from '$lib/components/EegPlanEditor.svelte';
	import ExperimentDataEditor from '$lib/components/ExperimentDataEditor.svelte';
	import ExperimentStepsEditor from '$lib/components/ExperimentStepsEditor.svelte';
	import {
		deleteSessionFile,
		getSession,
		getSessionFileLink,
		getSessionFiles,
		updateSessionFile,
		uploadSessionFile,
	} from '$lib/api';
	import type { Session, SessionFile } from '$lib/types';

	type FileMetadataDraft = {
		file_type: string;
		processing_stage: string;
		qc_status: string;
	};

	const PROCESSING_STAGE_OPTIONS = ['raw', 'preprocessed', 'derived', 'exported'];
	const QC_STATUS_OPTIONS = ['pending', 'passed', 'failed', 'needs_review'];

	let { data } = $props<{ data: { sessionId: string } }>();

	let session = $state<Session | null>(null);
	let files = $state<SessionFile[]>([]);
	let isLoading = $state(true);
	let isUploading = $state(false);
	let isDragActive = $state(false);
	let selectedFile = $state<File | null>(null);
	let fileType = $state('raw_eeg');
	let processingStage = $state('raw');
	let qcStatus = $state('pending');
	let errorMessage = $state('');
	let uploadMessage = $state('');
	let fileMessage = $state('');
	let fileError = $state('');
	let fileSearch = $state('');
	let fileTypeFilter = $state('all');
	let stageFilter = $state('all');
	let qcFilter = $state('all');
	let editingFileId = $state<string | number | null>(null);
	let savingFileId = $state<string | number | null>(null);
	let deletingFileId = $state<string | number | null>(null);
	let metadataDrafts = $state<Record<string, FileMetadataDraft>>({});
	const uploadSuccessMessage = 'Upload completed. The file list has been refreshed.';

	function getSessionLabel(currentSession: Session | null) {
		return currentSession?.session_label ?? currentSession?.title ?? `Session ${data.sessionId}`;
	}

	function getFileName(file: SessionFile) {
		return file.file_name ?? file.original_filename ?? file.filename;
	}

	function formatDate(value?: string | null) {
		return value
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(value),
				)
			: 'Pending';
	}

	function formatBytes(value?: number | null) {
		if (!value) {
			return 'Unknown size';
		}

		const units = ['B', 'KB', 'MB', 'GB'];
		let size = value;
		let index = 0;
		while (size >= 1024 && index < units.length - 1) {
			size /= 1024;
			index += 1;
		}
		return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
	}

	function getMetadataDraft(file: SessionFile): FileMetadataDraft {
		return {
			file_type: file.file_type ?? '',
			processing_stage: file.processing_stage ?? 'raw',
			qc_status: file.qc_status ?? 'pending',
		};
	}

	function getDraftForFile(file: SessionFile): FileMetadataDraft {
		return metadataDrafts[String(file.id)] ?? getMetadataDraft(file);
	}

	function startEditingFile(file: SessionFile) {
		metadataDrafts = {
			...metadataDrafts,
			[String(file.id)]: getMetadataDraft(file),
		};
		editingFileId = file.id;
		fileMessage = '';
		fileError = '';
	}

	function stopEditingFile() {
		editingFileId = null;
	}

	function updateDraftField(fileId: string | number, field: keyof FileMetadataDraft, value: string) {
		metadataDrafts = {
			...metadataDrafts,
			[String(fileId)]: {
				...(metadataDrafts[String(fileId)] ?? {
					file_type: '',
					processing_stage: 'raw',
					qc_status: 'pending',
				}),
				[field]: value,
			},
		};
	}

	function getLinkForFile(file: SessionFile): string | null {
		return getSessionFileLink(file);
	}

	function getUniqueValues(selector: (file: SessionFile) => string | null | undefined): string[] {
		return [...new Set(files.map(selector).filter((value): value is string => Boolean(value && value.trim())))]
			.sort((left, right) => left.localeCompare(right));
	}

	function getFilteredFiles(): SessionFile[] {
		const query = fileSearch.trim().toLowerCase();

		return files.filter((file) => {
			const name = getFileName(file).toLowerCase();
			const type = (file.file_type ?? '').toLowerCase();
			const stage = (file.processing_stage ?? '').toLowerCase();
			const qc = (file.qc_status ?? '').toLowerCase();
			const checksum = (file.checksum ?? '').toLowerCase();

			if (query && ![name, type, stage, qc, checksum].some((value) => value.includes(query))) {
				return false;
			}

			if (fileTypeFilter !== 'all' && (file.file_type ?? '') !== fileTypeFilter) {
				return false;
			}

			if (stageFilter !== 'all' && (file.processing_stage ?? '') !== stageFilter) {
				return false;
			}

			if (qcFilter !== 'all' && (file.qc_status ?? '') !== qcFilter) {
				return false;
			}

			return true;
		});
	}

	async function loadSessionPage() {
		isLoading = true;
		errorMessage = '';

		try {
			const [sessionResponse, filesResponse] = await Promise.all([
				getSession(data.sessionId),
				getSessionFiles(data.sessionId),
			]);

			session = sessionResponse;
			files = filesResponse.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load session details.';
		} finally {
			isLoading = false;
		}
	}

	function applyFileSelection(file: File | null) {
		selectedFile = file;
		if (file) {
			uploadMessage = `Ready to upload ${file.name}.`;
		}
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragActive = false;
		const file = event.dataTransfer?.files?.[0] ?? null;
		applyFileSelection(file);
	}

	async function handleUpload(event: SubmitEvent) {
		event.preventDefault();
		uploadMessage = '';

		if (!selectedFile) {
			uploadMessage = 'Choose or drop a file before uploading.';
			return;
		}

		isUploading = true;

		try {
			await uploadSessionFile(data.sessionId, {
				file: selectedFile,
				file_type: fileType,
				processing_stage: processingStage,
				qc_status: qcStatus,
			});
			selectedFile = null;
			uploadMessage = uploadSuccessMessage;
			await loadSessionPage();
		} catch (error) {
			uploadMessage = error instanceof Error ? error.message : 'Upload failed.';
		} finally {
			isUploading = false;
		}
	}

	async function saveFileMetadata(file: SessionFile) {
		const draft = getDraftForFile(file);
		savingFileId = file.id;
		fileMessage = '';
		fileError = '';

		try {
			const updated = await updateSessionFile(
				file.id,
				{
					file_type: draft.file_type.trim() || null,
					processing_stage: draft.processing_stage.trim() || null,
					qc_status: draft.qc_status.trim() || null,
				},
				data.sessionId,
			);
			files = files.map((entry) => (entry.id === file.id ? updated : entry));
			stopEditingFile();
			fileMessage = `Updated metadata for ${getFileName(updated)}.`;
		} catch (error) {
			fileError = error instanceof Error ? error.message : 'Unable to update file metadata.';
		} finally {
			savingFileId = null;
		}
	}

	async function removeFile(file: SessionFile) {
		if (!confirm(`Delete ${getFileName(file)} from this session?`)) {
			return;
		}

		deletingFileId = file.id;
		fileMessage = '';
		fileError = '';

		try {
			await deleteSessionFile(file.id, data.sessionId);
			files = files.filter((entry) => entry.id !== file.id);
			if (editingFileId === file.id) {
				stopEditingFile();
			}
			fileMessage = `Deleted ${getFileName(file)}.`;
		} catch (error) {
			fileError = error instanceof Error ? error.message : 'Unable to delete this file.';
		} finally {
			deletingFileId = null;
		}
	}

	onMount(loadSessionPage);
</script>

<svelte:head>
	<title>Session Detail | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Session Detail</p>
		<h2>{getSessionLabel(session)}</h2>
		<p class="page-copy">
			Experiment planning, EEG channel alignment, session files, and external data links now share one workspace.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="detail-grid">
	<article class="content-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Overview</p>
				<h3>{isLoading ? 'Loading session...' : getSessionLabel(session)}</h3>
			</div>
		</div>

		<div class="meta-grid">
			<div>
				<span>Status</span>
				<strong>{session?.status ?? 'unknown'}</strong>
			</div>
			<div>
				<span>Subject</span>
				<strong>{session?.subject?.code ?? session?.subject_id ?? 'unknown'}</strong>
			</div>
			<div>
				<span>Session Date</span>
				<strong>{formatDate(session?.session_date ?? session?.recorded_at)}</strong>
			</div>
			<div>
				<span>Files</span>
				<strong>{files.length}</strong>
			</div>
			<div>
				<span>Plan</span>
				<strong>{session?.experiment_plan_id ?? 'Not linked'}</strong>
			</div>
		</div>
	</article>

	<article class="content-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Upload</p>
				<h3>Add a session file</h3>
			</div>
		</div>

		<form class="upload-form" onsubmit={handleUpload}>
			<label
				class:file-dropzone-active={isDragActive}
				class="file-dropzone"
				ondragover={(event) => {
					event.preventDefault();
					isDragActive = true;
				}}
				ondragleave={() => {
					isDragActive = false;
				}}
				ondrop={handleFileDrop}
			>
				<input
					type="file"
					onchange={(event) => {
						const target = event.currentTarget as HTMLInputElement;
						applyFileSelection(target.files?.[0] ?? null);
					}}
				/>
				<strong>{selectedFile ? selectedFile.name : 'Drop a file here or click to browse'}</strong>
				<span>
					Session files are for assets the platform manages directly. This can later coexist with
					server-generated download links.
				</span>
			</label>

			<div class="form-grid">
				<label class="upload-input">
					<span>File type</span>
					<input
						type="text"
						value={fileType}
						oninput={(event) => {
							fileType = (event.currentTarget as HTMLInputElement).value;
						}}
					/>
				</label>

				<label class="upload-input">
					<span>Processing stage</span>
					<select bind:value={processingStage}>
						{#each PROCESSING_STAGE_OPTIONS as option}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>

				<label class="upload-input">
					<span>QC status</span>
					<select bind:value={qcStatus}>
						{#each QC_STATUS_OPTIONS as option}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="form-actions">
				<button type="submit" class="primary-button" disabled={isUploading}>
					{isUploading ? 'Uploading...' : 'Upload file'}
				</button>
			</div>
		</form>

		{#if uploadMessage}
			<p class:status-banner={true} class:error={uploadMessage !== uploadSuccessMessage}>
				{uploadMessage}
			</p>
		{/if}
	</article>
</section>

<ExperimentStepsEditor
	session={session}
	sessionId={data.sessionId}
	onSessionPatched={(nextSession) => {
		session = nextSession;
	}}
/>

<ExperimentDataEditor
	session={session}
	sessionId={data.sessionId}
	onSessionPatched={(nextSession) => {
		session = nextSession;
	}}
/>

<EegPlanEditor
	session={session}
	sessionId={data.sessionId}
	onSessionPatched={(nextSession) => {
		session = nextSession;
	}}
/>

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Session Files</p>
			<h3>{isLoading ? 'Loading...' : `${files.length} managed file record${files.length === 1 ? '' : 's'}`}</h3>
			<p class="page-copy">
				Use this area for files the platform owns directly, including upload, metadata cleanup, deletion,
				and eventual server-hosted download links.
			</p>
		</div>
	</div>

	<div class="session-file-filter-grid">
		<label class="form-field">
			<span>Search files</span>
			<input type="search" placeholder="Filename, type, stage, qc..." bind:value={fileSearch} />
		</label>

		<label class="form-field">
			<span>File type</span>
			<select bind:value={fileTypeFilter}>
				<option value="all">All file types</option>
				{#each getUniqueValues((file) => file.file_type) as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>

		<label class="form-field">
			<span>Processing stage</span>
			<select bind:value={stageFilter}>
				<option value="all">All stages</option>
				{#each getUniqueValues((file) => file.processing_stage) as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>

		<label class="form-field">
			<span>QC status</span>
			<select bind:value={qcFilter}>
				<option value="all">All QC states</option>
				{#each getUniqueValues((file) => file.qc_status) as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if fileMessage}
		<p class="status-banner">{fileMessage}</p>
	{/if}

	{#if fileError}
		<p class="status-banner error">{fileError}</p>
	{/if}

	{#if !getFilteredFiles().length && !isLoading}
		<p class="empty-state">No session files match the current filters yet.</p>
	{:else}
		<div class="session-file-list">
			{#each getFilteredFiles() as file (file.id)}
				<article class:editing-card={editingFileId === file.id} class="data-record-card session-file-card">
					<div class="session-file-card-header">
						<div>
							<h4>{getFileName(file)}</h4>
							<p class="record-meta">
								{formatBytes(file.size_bytes)} · Uploaded {formatDate(file.created_at ?? file.uploaded_at)}
							</p>
						</div>

						<div class="record-actions">
							{#if getLinkForFile(file)}
								<a
									class="secondary-button soft-button"
									href={getLinkForFile(file) ?? '#'}
									target="_blank"
									rel="noreferrer"
								>
									Open
								</a>
								<a class="secondary-button dark-button" href={getLinkForFile(file) ?? '#'} download>
									Download
								</a>
							{/if}

							{#if editingFileId === file.id}
								<button
									type="button"
									class="secondary-button soft-button"
									onclick={stopEditingFile}
									disabled={savingFileId === file.id}
								>
									Cancel
								</button>
								<button
									type="button"
									class="primary-button"
									onclick={() => saveFileMetadata(file)}
									disabled={savingFileId === file.id}
								>
									{savingFileId === file.id ? 'Saving...' : 'Save metadata'}
								</button>
								<button
									type="button"
									class="secondary-button danger-button"
									onclick={() => removeFile(file)}
									disabled={deletingFileId === file.id}
								>
									{deletingFileId === file.id ? 'Deleting...' : 'Delete'}
								</button>
							{:else}
								<button type="button" class="secondary-button soft-button" onclick={() => startEditingFile(file)}>
									Edit metadata
								</button>
							{/if}
						</div>
					</div>

					<div class="session-file-metadata-grid">
						<div class="step-summary-item">
							<span>File type</span>
							<strong>{file.file_type ?? 'Not set'}</strong>
						</div>
						<div class="step-summary-item">
							<span>Stage</span>
							<strong>{file.processing_stage ?? 'Not set'}</strong>
						</div>
						<div class="step-summary-item">
							<span>QC</span>
							<strong>{file.qc_status ?? 'Not set'}</strong>
						</div>
						<div class="step-summary-item">
							<span>Storage</span>
							<strong>{file.download_url ?? file.storage_path ?? 'Pending link'}</strong>
						</div>
					</div>

					{#if editingFileId === file.id}
						<div class="form-grid">
							<label class="form-field">
								<span>File type</span>
								<input
									type="text"
									value={getDraftForFile(file).file_type}
									oninput={(event) =>
										updateDraftField(file.id, 'file_type', (event.currentTarget as HTMLInputElement).value)}
								/>
							</label>

							<label class="form-field">
								<span>Processing stage</span>
								<select
									value={getDraftForFile(file).processing_stage}
									onchange={(event) =>
										updateDraftField(file.id, 'processing_stage', (event.currentTarget as HTMLSelectElement).value)}
								>
									{#each PROCESSING_STAGE_OPTIONS as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</label>

							<label class="form-field">
								<span>QC status</span>
								<select
									value={getDraftForFile(file).qc_status}
									onchange={(event) =>
										updateDraftField(file.id, 'qc_status', (event.currentTarget as HTMLSelectElement).value)}
								>
									{#each QC_STATUS_OPTIONS as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</label>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</section>
