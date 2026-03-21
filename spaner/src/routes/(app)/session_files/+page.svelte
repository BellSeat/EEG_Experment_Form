<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllExperimentData, getAllSessionFiles, getSessionFileLink, getSessions } from '$lib/api';
	import type { ExperimentData, Session, SessionFile } from '$lib/types';

	type SessionGroup = {
		sessionId: string;
		label: string;
		status: string;
		fileCount: number;
		recordCount: number;
		files: SessionFile[];
		records: ExperimentData[];
		isUnlinked?: boolean;
	};

	let files = $state<SessionFile[]>([]);
	let records = $state<ExperimentData[]>([]);
	let sessions = $state<Session[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let fileTypeFilter = $state('all');
	let stageFilter = $state('all');
	let qcFilter = $state('all');

	function formatDate(value?: string) {
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

	function getFileName(file: SessionFile) {
		return file.file_name ?? file.original_filename ?? file.filename;
	}

	function looksLikeUrl(value: string): boolean {
		return /^https?:\/\//i.test(value.trim());
	}

	function getSessionLabel(sessionId: string | number): string {
		const session = sessions.find((entry) => String(entry.id) === String(sessionId));
		if (!session) {
			return `Session ${sessionId}`;
		}

		return session.session_label ?? session.title ?? `Session ${sessionId}`;
	}

	function getSessionStatus(sessionId: string | number): string {
		const session = sessions.find((entry) => String(entry.id) === String(sessionId));
		return session?.status ?? 'unknown';
	}

	function findSessionByRecord(record: ExperimentData): Session | null {
		if (!record.experiment_plan) {
			return null;
		}

		return (
			sessions.find((session) => String(session.experiment_plan_id ?? '') === String(record.experiment_plan)) ??
			null
		);
	}

	function getUniqueValues(selector: (file: SessionFile) => string | null | undefined): string[] {
		return [...new Set(files.map(selector).filter((value): value is string => Boolean(value && value.trim())))]
			.sort((left, right) => left.localeCompare(right));
	}

	function getFilteredFiles(): SessionFile[] {
		const query = searchQuery.trim().toLowerCase();

		return files.filter((file) => {
			const terms = [
				getFileName(file).toLowerCase(),
				String(file.session_id).toLowerCase(),
				getSessionLabel(file.session_id).toLowerCase(),
				(file.file_type ?? '').toLowerCase(),
				(file.processing_stage ?? '').toLowerCase(),
				(file.qc_status ?? '').toLowerCase(),
			];

			if (query && !terms.some((term) => term.includes(query))) {
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

	function getFilteredRecords(): ExperimentData[] {
		const query = searchQuery.trim().toLowerCase();

		return records.filter((record) => {
			if (!query) {
				return true;
			}

			const session = findSessionByRecord(record);
			const terms = [
				record.file_path.toLowerCase(),
				String(record.id).toLowerCase(),
				String(record.experiment_plan ?? '').toLowerCase(),
				session ? getSessionLabel(session.id).toLowerCase() : 'unlinked record',
			];

			return terms.some((term) => term.includes(query));
		});
	}

	function getGroupedAssets(): SessionGroup[] {
		const groups = new Map<string, SessionGroup>();

		for (const file of getFilteredFiles()) {
			const sessionId = String(file.session_id);
			const existing = groups.get(sessionId);

			if (existing) {
				existing.files.push(file);
				existing.fileCount += 1;
				continue;
			}

			groups.set(sessionId, {
				sessionId,
				label: getSessionLabel(file.session_id),
				status: getSessionStatus(file.session_id),
				fileCount: 1,
				recordCount: 0,
				files: [file],
				records: [],
			});
		}

		for (const record of getFilteredRecords()) {
			const session = findSessionByRecord(record);
			const sessionId = session ? String(session.id) : `unlinked-${String(record.experiment_plan ?? record.id)}`;
			const existing = groups.get(sessionId);

			if (existing) {
				existing.records.push(record);
				existing.recordCount += 1;
				continue;
			}

			groups.set(sessionId, {
				sessionId,
				label: session ? getSessionLabel(session.id) : 'Unlinked external records',
				status: session ? getSessionStatus(session.id) : 'unlinked',
				fileCount: 0,
				recordCount: 1,
				files: [],
				records: [record],
				isUnlinked: !session,
			});
		}

		return [...groups.values()].sort((left, right) => {
			if (left.isUnlinked && !right.isUnlinked) {
				return 1;
			}
			if (!left.isUnlinked && right.isUnlinked) {
				return -1;
			}
			return left.label.localeCompare(right.label);
		});
	}

	onMount(async () => {
		try {
			const [filesResponse, recordsResponse, sessionsResponse] = await Promise.all([
				getAllSessionFiles(),
				getAllExperimentData(),
				getSessions(),
			]);
			files = filesResponse.items;
			records = recordsResponse.items;
			sessions = sessionsResponse.items;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load session assets.';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Session Files | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Session Files</p>
		<h2>Managed assets across all sessions</h2>
		<p class="page-copy">
			Browse platform-managed files and external URL records together, grouped by session, with quick links back to
			each workspace.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Library</p>
			<h3>
				{isLoading
					? 'Loading...'
					: `${files.length} managed file${files.length === 1 ? '' : 's'} · ${records.length} URL record${records.length === 1 ? '' : 's'}`}
			</h3>
		</div>
	</div>

	<div class="session-file-filter-grid">
		<label class="form-field">
			<span>Search</span>
			<input type="search" placeholder="Session, filename, path, stage, qc..." bind:value={searchQuery} />
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
			<span>Stage</span>
			<select bind:value={stageFilter}>
				<option value="all">All stages</option>
				{#each getUniqueValues((file) => file.processing_stage) as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>

		<label class="form-field">
			<span>QC</span>
			<select bind:value={qcFilter}>
				<option value="all">All QC states</option>
				{#each getUniqueValues((file) => file.qc_status) as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if !getGroupedAssets().length && !isLoading}
		<p class="empty-state">No managed files or URL records match the current filters yet.</p>
	{:else}
		<div class="session-file-group-list">
			{#each getGroupedAssets() as group}
				<section class="content-card session-file-group-card">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Session</p>
							<h3>{group.label}</h3>
							<p class="page-copy">
								{group.fileCount} managed file{group.fileCount === 1 ? '' : 's'} ·
								{group.recordCount} URL record{group.recordCount === 1 ? '' : 's'} · Status {group.status}
							</p>
						</div>
						{#if !group.isUnlinked}
							<div class="toolbar-group">
								<a class="secondary-button soft-button" href={`/sessions/${group.sessionId}`}>Manage session</a>
							</div>
						{/if}
					</div>

					{#if group.files.length}
						<p class="eyebrow">Managed Files</p>
						<div class="session-file-list">
							{#each group.files as file (file.id)}
								<article class="data-record-card session-file-card">
									<div class="session-file-card-header">
										<div>
											<h4>{getFileName(file)}</h4>
											<p class="record-meta">
												{formatBytes(file.size_bytes)} · Uploaded {formatDate(file.created_at ?? file.uploaded_at)}
											</p>
										</div>

										<div class="record-actions">
											{#if getSessionFileLink(file)}
												<a
													class="secondary-button soft-button"
													href={getSessionFileLink(file) ?? '#'}
													target="_blank"
													rel="noreferrer"
												>
													Open
												</a>
												<a class="secondary-button dark-button" href={getSessionFileLink(file) ?? '#'} download>
													Download
												</a>
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
											<strong class="truncated-inline" title={file.download_url ?? file.storage_path ?? 'Pending link'}>
												{file.download_url ?? file.storage_path ?? 'Pending link'}
											</strong>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}

					{#if group.records.length}
						<p class="eyebrow">URL Records</p>
						<div class="session-file-list">
							{#each group.records as record (record.id)}
								<article class="data-record-card session-file-card">
									<div class="session-file-card-header">
										<div>
											<h4>Record #{record.id}</h4>
											<p class="record-meta">
												Owner {record.owner_id} · Added {record.create_at ? new Date(record.create_at).toLocaleString() : 'Pending'}
											</p>
										</div>

										<div class="record-actions">
											{#if looksLikeUrl(record.file_path)}
												<a class="secondary-button soft-button" href={record.file_path} target="_blank" rel="noreferrer">
													Open
												</a>
											{/if}
										</div>
									</div>

									<div class="session-file-metadata-grid">
										<div class="step-summary-item">
											<span>Record type</span>
											<strong>External URL / path</strong>
										</div>
										<div class="step-summary-item">
											<span>Plan</span>
											<strong>{record.experiment_plan ?? 'Not linked'}</strong>
										</div>
										<div class="step-summary-item session-file-metadata-span-2">
											<span>Location</span>
											<strong class="truncated-inline" title={record.file_path}>{record.file_path}</strong>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</section>
