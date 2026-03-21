<script lang="ts">
	import { onMount } from 'svelte';
	import {
		addSubjectMember,
		createSubjectInvitation,
		deleteSubjectMember,
		getSubject,
		getSubjectInvitations,
		getSubjectMembers,
		searchUsers,
		transferSubjectOwnership,
		updateSubjectMember,
	} from '$lib/api';
	import type {
		CollaborationStatus,
		CollaboratorRole,
		Subject,
		SubjectInvitation,
		SubjectMember,
		UserDirectoryEntry,
	} from '$lib/types';

	const ROLE_OPTIONS: CollaboratorRole[] = ['owner', 'admin', 'editor', 'uploader', 'viewer'];
	const MEMBERSHIP_STATUS_OPTIONS: CollaborationStatus[] = ['active', 'inactive', 'removed'];

	let { data } = $props<{ data: { subjectId: string } }>();

	let subject = $state<Subject | null>(null);
	let members = $state<SubjectMember[]>([]);
	let invitations = $state<SubjectInvitation[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let statusMessage = $state('');
	let latestInvitationToken = $state('');
	let latestInvitationEmail = $state('');

	let showInviteModal = $state(false);
	let showEditModal = $state(false);
	let showTransferModal = $state(false);

	let inviteMode = $state<'user' | 'email'>('user');
	let inviteRole = $state<Exclude<CollaboratorRole, 'owner'>>('viewer');
	let invitePermissionsText = $state('{}');
	let inviteEmail = $state('');
	let inviteSearchQuery = $state('');
	let inviteSearchResults = $state<UserDirectoryEntry[]>([]);
	let selectedUserId = $state('');
	let isSearchingUsers = $state(false);
	let isSubmittingInvite = $state(false);
	let inviteError = $state('');

	let editingMember = $state<SubjectMember | null>(null);
	let memberRole = $state<Exclude<CollaboratorRole, 'owner'>>('viewer');
	let memberStatus = $state<CollaborationStatus>('active');
	let memberPermissionsText = $state('{}');
	let memberError = $state('');
	let isSavingMember = $state(false);

	let transferUserId = $state('');
	let transferError = $state('');
	let isTransferring = $state(false);

	function formatDate(value?: string | null) {
		return value
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
			: 'Pending';
	}

	function coerceRole(value?: string | null): Exclude<CollaboratorRole, 'owner'> {
		return value === 'admin' || value === 'editor' || value === 'uploader' || value === 'viewer'
			? value
			: 'viewer';
	}

	function coerceMembershipStatus(value?: string | null): CollaborationStatus {
		return MEMBERSHIP_STATUS_OPTIONS.includes(value as CollaborationStatus)
			? (value as CollaborationStatus)
			: 'active';
	}

	function hasCapability(capability: string) {
		return subject?.current_user_capabilities.includes(capability) ?? false;
	}

	function subjectLabel(currentSubject: Subject | null) {
		return currentSubject?.subject_code ?? currentSubject?.code ?? `Lobby ${data.subjectId}`;
	}

	function memberLabel(member: SubjectMember) {
		return member.display_name?.trim() || member.username?.trim() || member.email?.trim() || `User #${member.user_id}`;
	}

	function userLabel(user: UserDirectoryEntry) {
		return user.display_name?.trim() || user.username?.trim() || user.email?.trim() || `User #${user.id}`;
	}

	function capabilitiesSummary(member: SubjectMember) {
		return member.capabilities.length ? member.capabilities.join(', ') : 'Default role only';
	}

	function permissionsSummary(permissions: Record<string, unknown>) {
		const keys = Object.keys(permissions);
		return keys.length ? keys.join(', ') : 'No custom overrides';
	}

	function prettyJson(value: Record<string, unknown> | undefined) {
		return JSON.stringify(value ?? {}, null, 2);
	}

	function parsePermissions(text: string) {
		const normalized = text.trim();
		if (!normalized) {
			return {};
		}
		const parsed = JSON.parse(normalized) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('Permissions must be a JSON object.');
		}
		return parsed as Record<string, unknown>;
	}

	function eligibleTransferMembers() {
		return members.filter(
			(member) => member.status === 'active' && String(member.user_id) !== String(subject?.owner_user_id ?? ''),
		);
	}

	async function loadSubjectPage() {
		isLoading = true;
		errorMessage = '';

		try {
			const subjectResponse = await getSubject(data.subjectId);
			subject = subjectResponse;

			const [memberRows, invitationRows] = await Promise.all([
				getSubjectMembers(data.subjectId),
				subjectResponse.current_user_capabilities.includes('subject:manage_members')
					? getSubjectInvitations(data.subjectId)
					: Promise.resolve([]),
			]);
			members = memberRows;
			invitations = invitationRows;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load lobby details.';
		} finally {
			isLoading = false;
		}
	}

	async function refreshSubjectPage() {
		try {
			const subjectResponse = await getSubject(data.subjectId);
			subject = subjectResponse;
			const [memberRows, invitationRows] = await Promise.all([
				getSubjectMembers(data.subjectId),
				subjectResponse.current_user_capabilities.includes('subject:manage_members')
					? getSubjectInvitations(data.subjectId)
					: Promise.resolve([]),
			]);
			members = memberRows;
			invitations = invitationRows;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to refresh lobby details.';
		}
	}

	function resetInviteModal(mode: 'user' | 'email' = 'user') {
		inviteMode = mode;
		inviteRole = 'viewer';
		invitePermissionsText = '{}';
		inviteEmail = '';
		inviteSearchQuery = '';
		inviteSearchResults = [];
		selectedUserId = '';
		inviteError = '';
	}

	function openInviteModal(mode: 'user' | 'email' = 'user') {
		resetInviteModal(mode);
		showInviteModal = true;
	}

	function closeInviteModal() {
		showInviteModal = false;
		inviteError = '';
	}

	function openEditModal(member: SubjectMember) {
		editingMember = member;
		memberRole = coerceRole(member.role);
		memberStatus = coerceMembershipStatus(member.status);
		memberPermissionsText = prettyJson(member.permissions);
		memberError = '';
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		editingMember = null;
		memberError = '';
	}

	function openTransferModal() {
		transferUserId = String(eligibleTransferMembers()[0]?.user_id ?? '');
		transferError = '';
		showTransferModal = true;
	}

	function closeTransferModal() {
		showTransferModal = false;
		transferError = '';
	}

	async function runUserSearch() {
		inviteError = '';
		inviteSearchResults = [];
		if (!inviteSearchQuery.trim()) {
			inviteError = 'Enter a username, email, or display name before searching.';
			return;
		}

		isSearchingUsers = true;
		try {
			inviteSearchResults = await searchUsers(inviteSearchQuery);
		} catch (error) {
			inviteError = error instanceof Error ? error.message : 'Unable to search users.';
		} finally {
			isSearchingUsers = false;
		}
	}

	async function submitInvite(event: SubmitEvent) {
		event.preventDefault();
		inviteError = '';
		statusMessage = '';
		isSubmittingInvite = true;

		try {
			const permissions = parsePermissions(invitePermissionsText);
			if (inviteMode === 'user') {
				if (!selectedUserId) {
					throw new Error('Choose a user before adding a direct member.');
				}
				await addSubjectMember(data.subjectId, {
					user_id: Number(selectedUserId),
					role: inviteRole,
					permissions,
				});
				statusMessage = 'Added the selected user to this lobby.';
				latestInvitationToken = '';
				latestInvitationEmail = '';
			} else {
				if (!inviteEmail.trim()) {
					throw new Error('Enter an email address before creating an invitation.');
				}
				const invitation = await createSubjectInvitation(data.subjectId, {
					email: inviteEmail.trim(),
					role: inviteRole,
					permissions,
				});
				statusMessage = `Created an invitation for ${invitation.invited_email}.`;
				latestInvitationToken = invitation.invite_token ?? '';
				latestInvitationEmail = invitation.invited_email;
			}
			await refreshSubjectPage();
			closeInviteModal();
		} catch (error) {
			inviteError = error instanceof Error ? error.message : 'Unable to submit the invite.';
		} finally {
			isSubmittingInvite = false;
		}
	}

	async function saveMember(event: SubmitEvent) {
		event.preventDefault();
		if (!editingMember) {
			return;
		}

		memberError = '';
		statusMessage = '';
		isSavingMember = true;

		try {
			const permissions = parsePermissions(memberPermissionsText);
			await updateSubjectMember(data.subjectId, editingMember.user_id, {
				role: memberRole,
				status: memberStatus,
				permissions,
			});
			statusMessage = `Updated access for ${memberLabel(editingMember)}.`;
			await refreshSubjectPage();
			closeEditModal();
		} catch (error) {
			memberError = error instanceof Error ? error.message : 'Unable to update the lobby member.';
		} finally {
			isSavingMember = false;
		}
	}

	async function removeMember(member: SubjectMember) {
		if (!confirm(`Remove ${memberLabel(member)} from this lobby?`)) {
			return;
		}

		statusMessage = '';
		errorMessage = '';

		try {
			await deleteSubjectMember(data.subjectId, member.user_id);
			statusMessage = `Removed ${memberLabel(member)} from the lobby.`;
			await refreshSubjectPage();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to remove this lobby member.';
		}
	}

	async function submitTransfer(event: SubmitEvent) {
		event.preventDefault();
		transferError = '';
		statusMessage = '';

		if (!transferUserId) {
			transferError = 'Select a new owner before transferring ownership.';
			return;
		}

		isTransferring = true;
		try {
			subject = await transferSubjectOwnership(data.subjectId, {
				new_owner_user_id: Number(transferUserId),
			});
			statusMessage = 'Lobby ownership transferred successfully.';
			await refreshSubjectPage();
			closeTransferModal();
		} catch (error) {
			transferError = error instanceof Error ? error.message : 'Unable to transfer lobby ownership.';
		} finally {
			isTransferring = false;
		}
	}

	onMount(loadSubjectPage);
</script>

<svelte:head>
	<title>Lobby Detail | SPANER Lab Portal</title>
</svelte:head>

<section class="page-header">
	<div>
		<p class="eyebrow">Lobby</p>
		<h2>{subjectLabel(subject)}</h2>
		<p class="page-copy">
			This is the member and permission center for the lobby. Sessions under this subject inherit these permissions by default.
		</p>
	</div>
	<div class="page-actions">
		<a href="/subjects" class="secondary-link-button">Back to Lobbies</a>
		{#if hasCapability('subject:manage_members')}
			<button type="button" class="primary-button" onclick={() => openInviteModal('user')}>Invite Member</button>
		{/if}
		{#if hasCapability('subject:transfer')}
			<button type="button" class="secondary-button dark-button" onclick={openTransferModal}>Transfer Ownership</button>
		{/if}
	</div>
</section>

{#if errorMessage}
	<p class="status-banner error">{errorMessage}</p>
{/if}

{#if statusMessage}
	<p class="status-banner">{statusMessage}</p>
{/if}

{#if latestInvitationToken}
	<section class="content-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Latest Invite Token</p>
				<h3>{latestInvitationEmail}</h3>
			</div>
		</div>
		<p class="page-copy">Users invited by email can also be auto-matched on login or registration if they use the same email.</p>
		<pre class="json-preview">{latestInvitationToken}</pre>
	</section>
{/if}

<section class="detail-grid project-overview-grid">
	<article class="content-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Overview</p>
				<h3>{isLoading ? 'Loading lobby...' : subjectLabel(subject)}</h3>
			</div>
		</div>

		<div class="meta-grid">
			<div>
				<span>Lobby Code</span>
				<strong>{subjectLabel(subject)}</strong>
			</div>
			<div>
				<span>Status</span>
				<strong>{subject?.status ?? 'unknown'}</strong>
			</div>
			<div>
				<span>Your role</span>
				<strong>{subject?.current_user_role ?? 'member'}</strong>
			</div>
			<div>
				<span>Owner user id</span>
				<strong>{subject?.owner_user_id ?? 'Unknown'}</strong>
			</div>
			<div>
				<span>Members</span>
				<strong>{members.length}</strong>
			</div>
			<div>
				<span>Pending invites</span>
				<strong>{invitations.filter((entry) => entry.status === 'pending').length}</strong>
			</div>
		</div>

		{#if subject?.notes}
			<div class="helper-panel">
				<span>Notes</span>
				<p>{subject.notes}</p>
			</div>
		{/if}
	</article>

	<article class="content-card">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Capabilities</p>
				<h3>{subject?.current_user_capabilities.length ?? 0} granted</h3>
			</div>
			{#if hasCapability('subject:manage_members')}
				<button type="button" class="secondary-button soft-button" onclick={() => openInviteModal('email')}>
					Invite by Email
				</button>
			{/if}
		</div>

		{#if subject?.current_user_capabilities.length}
			<div class="capability-pill-row">
				{#each subject.current_user_capabilities as capability}
					<span class="capability-pill">{capability}</span>
				{/each}
			</div>
		{:else}
			<p class="empty-state">No capabilities returned for the current user.</p>
		{/if}
	</article>
</section>

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Members</p>
			<h3>{isLoading ? 'Loading...' : `${members.length} collaborator${members.length === 1 ? '' : 's'}`}</h3>
		</div>
	</div>

	{#if !members.length && !isLoading}
		<p class="empty-state">No lobby members returned yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Member</th>
						<th>Role</th>
						<th>Status</th>
						<th>Capabilities</th>
						<th>Permissions</th>
						<th>Accepted</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each members as member}
						<tr>
							<td>
								<div class="member-identity">
									<strong>{memberLabel(member)}</strong>
									<div class="table-subcopy">
										{member.email ?? 'No email'}{member.username ? ` / @${member.username}` : ''}
									</div>
								</div>
							</td>
							<td><span class="role-badge">{member.role}</span></td>
							<td><span class="role-badge">{member.status}</span></td>
							<td class="capability-cell">{capabilitiesSummary(member)}</td>
							<td class="capability-cell">{permissionsSummary(member.permissions)}</td>
							<td>{formatDate(member.accepted_at ?? member.created_at)}</td>
							<td>
								<div class="table-actions">
									{#if hasCapability('subject:manage_members')}
										<button type="button" class="secondary-button soft-button" onclick={() => openEditModal(member)}>
											Edit
										</button>
										{#if String(member.user_id) !== String(subject?.owner_user_id ?? '')}
											<button
												type="button"
												class="secondary-button danger-button"
												onclick={() => removeMember(member)}
											>
												Remove
											</button>
										{/if}
									{:else}
										<span class="table-subcopy">View only</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<section class="content-card">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Invitations</p>
			<h3>{isLoading ? 'Loading...' : `${invitations.length} invitation${invitations.length === 1 ? '' : 's'}`}</h3>
		</div>
	</div>

	{#if !hasCapability('subject:manage_members')}
		<p class="empty-state">Invitation management is available to members who can manage lobby membership.</p>
	{:else if !invitations.length && !isLoading}
		<p class="empty-state">No invitations have been created for this lobby yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Permissions</th>
						<th>Expires</th>
						<th>Accepted</th>
					</tr>
				</thead>
				<tbody>
					{#each invitations as invitation}
						<tr>
							<td>{invitation.invited_email}</td>
							<td><span class="role-badge">{invitation.role}</span></td>
							<td><span class="role-badge">{invitation.status}</span></td>
							<td class="capability-cell">{permissionsSummary(invitation.permissions)}</td>
							<td>{formatDate(invitation.expires_at)}</td>
							<td>{formatDate(invitation.accepted_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if showInviteModal}
	<div class="modal-backdrop" role="presentation">
		<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Invite</p>
					<h3 id="invite-modal-title">Add a lobby collaborator</h3>
				</div>
				<button type="button" class="secondary-button soft-button" onclick={closeInviteModal}>Close</button>
			</div>

			<div class="modal-tab-row">
				<button type="button" class="secondary-button" onclick={() => (inviteMode = 'user')}>Search User</button>
				<button type="button" class="secondary-button" onclick={() => (inviteMode = 'email')}>Invite by Email</button>
			</div>

			<form class="session-form" onsubmit={submitInvite}>
				{#if inviteMode === 'user'}
					<div class="search-panel">
						<div class="search-row">
							<label class="form-field form-field-full">
								<span class="field-caption">Search people</span>
								<input type="search" placeholder="username, email, or display name" bind:value={inviteSearchQuery} />
							</label>
							<button type="button" class="secondary-button soft-button" onclick={runUserSearch} disabled={isSearchingUsers}>
								{isSearchingUsers ? 'Searching...' : 'Find users'}
							</button>
						</div>

						{#if inviteSearchResults.length}
							<div class="search-result-list">
								{#each inviteSearchResults as result}
									<label class:selected-result={selectedUserId === String(result.id)} class="search-result-card">
										<input type="radio" bind:group={selectedUserId} value={String(result.id)} />
										<div>
											<strong>{userLabel(result)}</strong>
											<p>{result.email} / @{result.username}</p>
										</div>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<label class="form-field">
						<span class="field-caption">Invite email</span>
						<input type="email" placeholder="researcher@example.com" bind:value={inviteEmail} required />
					</label>
				{/if}

				<div class="form-grid">
					<label class="form-field">
						<span class="field-caption">Role</span>
						<select bind:value={inviteRole}>
							{#each ROLE_OPTIONS.filter((role) => role !== 'owner') as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
					</label>
				</div>

				<label class="form-field form-field-full">
					<span class="field-caption">Permission overrides JSON</span>
					<textarea
						rows="8"
						bind:value={invitePermissionsText}
						placeholder={'{}\n\nExample:\n{"allow":["session:handover"],"deny":["file:delete"]}'}
					></textarea>
				</label>

				{#if inviteError}
					<p class="status-banner error">{inviteError}</p>
				{/if}

				<div class="form-actions">
					<button type="button" class="secondary-button soft-button" onclick={closeInviteModal}>Cancel</button>
					<button type="submit" class="primary-button" disabled={isSubmittingInvite}>
						{isSubmittingInvite ? 'Submitting...' : inviteMode === 'user' ? 'Add member' : 'Create invite'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showEditModal && editingMember}
	<div class="modal-backdrop" role="presentation">
		<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Member Access</p>
					<h3 id="member-modal-title">{memberLabel(editingMember)}</h3>
				</div>
				<button type="button" class="secondary-button soft-button" onclick={closeEditModal}>Close</button>
			</div>

			<form class="session-form" onsubmit={saveMember}>
				<div class="form-grid">
					<label class="form-field">
						<span class="field-caption">Role</span>
						<select bind:value={memberRole} disabled={String(editingMember.user_id) === String(subject?.owner_user_id ?? '')}>
							{#each ROLE_OPTIONS.filter((role) => role !== 'owner') as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
					</label>

					<label class="form-field">
						<span class="field-caption">Status</span>
						<select bind:value={memberStatus}>
							{#each MEMBERSHIP_STATUS_OPTIONS as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>
				</div>

				<label class="form-field form-field-full">
					<span class="field-caption">Permission overrides JSON</span>
					<textarea rows="8" bind:value={memberPermissionsText}></textarea>
				</label>

				{#if memberError}
					<p class="status-banner error">{memberError}</p>
				{/if}

				<div class="form-actions">
					<button type="button" class="secondary-button soft-button" onclick={closeEditModal}>Cancel</button>
					<button type="submit" class="primary-button" disabled={isSavingMember}>
						{isSavingMember ? 'Saving...' : 'Save access'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showTransferModal}
	<div class="modal-backdrop" role="presentation">
		<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Ownership</p>
					<h3 id="transfer-modal-title">Transfer lobby ownership</h3>
				</div>
				<button type="button" class="secondary-button soft-button" onclick={closeTransferModal}>Close</button>
			</div>

			<form class="session-form" onsubmit={submitTransfer}>
				<label class="form-field">
					<span class="field-caption">New owner</span>
					<select bind:value={transferUserId} required>
						<option value="" disabled selected={!transferUserId}>Select a lobby member</option>
						{#each eligibleTransferMembers() as member}
							<option value={String(member.user_id)}>{memberLabel(member)} ({member.role})</option>
						{/each}
					</select>
				</label>

				{#if transferError}
					<p class="status-banner error">{transferError}</p>
				{/if}

				<div class="form-actions">
					<button type="button" class="secondary-button soft-button" onclick={closeTransferModal}>Cancel</button>
					<button type="submit" class="primary-button" disabled={isTransferring}>
						{isTransferring ? 'Transferring...' : 'Transfer ownership'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
