export type EntityId = number | string;

export type UserRole = 'admin' | 'researcher' | 'uploader';
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'uploader' | 'viewer';
export type CollaborationStatus = 'active' | 'inactive' | 'removed';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type AccessSource = 'subject' | 'session';

export interface AuthUser {
	id: EntityId;
	username: string;
	email: string;
	role: UserRole;
	display_name?: string | null;
	global_role?: string | null;
	status?: string | null;
	is_active?: boolean | null;
	last_login_at?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AuthState {
	token: string | null;
	user: AuthUser | null;
	remember: boolean;
}

export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	user: AuthUser;
	token_type?: string;
	expires_in?: number;
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	invitation_code: string;
	display_name?: string;
}

export interface RegisterResponse {
	message?: string;
	user?: AuthUser;
	token?: string;
	token_type?: string;
	expires_in?: number;
}

export interface ApiListResponse<T> {
	items: T[];
	total: number;
	page?: number;
	page_size?: number;
}

export interface UserDirectoryEntry {
	id: EntityId;
	username: string;
	email: string;
	role: string;
	display_name?: string | null;
	global_role?: string | null;
	status?: string | null;
	is_active?: boolean | null;
	last_login_at?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface Subject {
	id: EntityId;
	subject_code?: string;
	code?: string;
	status: 'active' | 'inactive' | 'archived' | 'draft';
	notes?: string | null;
	description?: string | null;
	owner_user_id?: EntityId | null;
	created_by?: EntityId | null;
	updated_by?: EntityId | null;
	created_at?: string;
	updated_at?: string | null;
	current_user_role?: CollaboratorRole | string | null;
	current_user_capabilities: string[];
}

export interface SubjectCreatePayload {
	subject_code: string;
	status?: 'active' | 'inactive' | 'archived';
	notes?: string | null;
}

export interface SubjectMember {
	id: EntityId;
	subject_id: EntityId;
	user_id: EntityId;
	username?: string | null;
	email?: string | null;
	display_name?: string | null;
	role: CollaboratorRole | string;
	permissions: Record<string, unknown>;
	status: CollaborationStatus | string;
	invited_by?: EntityId | null;
	accepted_at?: string | null;
	created_at?: string;
	updated_at?: string;
	capabilities: string[];
}

export interface SubjectInvitation {
	id: EntityId;
	subject_id: EntityId;
	invited_email: string;
	role: CollaboratorRole | string;
	permissions: Record<string, unknown>;
	invited_by?: EntityId | null;
	expires_at?: string;
	accepted_by_user_id?: EntityId | null;
	accepted_at?: string | null;
	status: InvitationStatus | string;
	created_at?: string;
	updated_at?: string;
	invite_token?: string | null;
}

export interface SubjectMemberCreatePayload {
	user_id: EntityId;
	role: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
}

export interface SubjectMemberUpdatePayload {
	role?: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
	status?: CollaborationStatus;
}

export interface SubjectInvitationCreatePayload {
	email: string;
	role: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
	expires_at?: string | null;
}

export interface TransferOwnershipPayload {
	new_owner_user_id: EntityId;
}

export interface SessionHandoverPayload {
	assigned_to_user_id: EntityId;
	operator_id?: EntityId | null;
}

export interface Session {
	id: EntityId;
	subject_id: EntityId;
	experiment_plan_id?: EntityId | null;
	owner_user_id?: EntityId | null;
	assigned_to_user_id?: EntityId | null;
	operator_id?: EntityId | null;
	title?: string;
	session_label?: string;
	status: 'planned' | 'in_progress' | 'completed' | 'failed' | 'archived' | 'recording' | 'processing';
	recorded_at?: string | null;
	session_date?: string | null;
	notes?: string | null;
	file_count?: number;
	created_at?: string;
	updated_at?: string;
	current_user_role?: CollaboratorRole | string | null;
	current_user_capabilities: string[];
	subject?: Subject;
}

export interface SessionCreatePayload {
	subject_id: EntityId;
	experiment_plan_id?: EntityId | null;
	operator_id?: EntityId;
	assigned_to_user_id?: EntityId | null;
	session_label: string;
	session_date: string;
	status?: Session['status'];
	notes?: string | null;
}

export interface SessionUpdatePayload {
	experiment_plan_id?: EntityId | null;
	operator_id?: EntityId | null;
	assigned_to_user_id?: EntityId | null;
	session_label?: string;
	session_date?: string;
	status?: Session['status'];
	notes?: string | null;
}

export interface SessionMember {
	id: EntityId;
	session_id: EntityId;
	user_id: EntityId;
	username?: string | null;
	email?: string | null;
	display_name?: string | null;
	role: CollaboratorRole | string;
	permissions: Record<string, unknown>;
	status: CollaborationStatus | string;
	invited_by?: EntityId | null;
	accepted_at?: string | null;
	created_at?: string;
	updated_at?: string;
	capabilities: string[];
	access_source?: AccessSource;
	inherited?: boolean;
}

export interface SessionInvitation {
	id: EntityId;
	session_id: EntityId;
	invited_email: string;
	role: CollaboratorRole | string;
	permissions: Record<string, unknown>;
	invited_by?: EntityId | null;
	expires_at?: string;
	accepted_by_user_id?: EntityId | null;
	accepted_at?: string | null;
	status: InvitationStatus | string;
	created_at?: string;
	updated_at?: string;
	invite_token?: string | null;
}

export interface SessionMemberCreatePayload {
	user_id: EntityId;
	role: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
}

export interface SessionMemberUpdatePayload {
	role?: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
	status?: CollaborationStatus;
}

export interface SessionInvitationCreatePayload {
	email: string;
	role: Exclude<CollaboratorRole, 'owner'>;
	permissions?: Record<string, unknown>;
	expires_at?: string | null;
}

export interface SessionFile {
	id: EntityId;
	session_id: EntityId;
	filename: string;
	file_name?: string;
	original_filename?: string | null;
	content_type?: string | null;
	mime_type?: string | null;
	size_bytes?: number | null;
	file_type?: string | null;
	storage_key?: string | null;
	storage_path?: string | null;
	uploaded_at?: string;
	created_at?: string;
	download_url?: string | null;
	qc_status?: string | null;
	processing_stage?: string | null;
	checksum?: string | null;
	uploaded_by?: EntityId | null;
}

export interface SessionFileUploadPayload {
	file: File;
	file_type: string;
	qc_status?: string;
	processing_stage?: string;
	mime_type?: string;
}

export interface SessionFileUpdatePayload {
	file_type?: string | null;
	qc_status?: string | null;
	processing_stage?: string | null;
}

export interface AuditLogEntry {
	id: EntityId;
	actor_user_id?: EntityId | null;
	action: string;
	resource_type: string;
	resource_id?: EntityId | null;
	subject_id?: EntityId | null;
	session_id?: EntityId | null;
	details?: Record<string, unknown> | null;
	actor?: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'> | null;
	created_at?: string;
}

export interface DashboardSummary {
	subjects: number;
	sessions: number;
	session_files: number;
	recent_audit_events: number;
}

export interface ExperimentStep {
	id: EntityId;
	experiment_id: EntityId;
	order_of_step: number;
	description: string;
	action_label?: string;
	duration_seconds?: number | null;
	sets?: number | null;
	notes?: string | null;
}

export interface ExperimentStepCreatePayload {
	experiment_id: EntityId;
	order_of_step: number;
	description: string;
}

export interface ExperimentStepUpdatePayload {
	experiment_id?: EntityId;
	order_of_step?: number;
	description?: string;
}

export interface ExperimentData {
	id: EntityId;
	owner_id: EntityId;
	file_path: string;
	experiment_plan?: EntityId | null;
	subject_id?: EntityId | null;
	create_at?: string;
}

export interface ExperimentDataCreatePayload {
	owner_id: EntityId;
	file_path: string;
	experiment_plan?: EntityId | null;
}

export interface ExperimentDataUpdatePayload {
	owner_id?: EntityId;
	file_path?: string;
	experiment_plan?: EntityId | null;
}

export interface EegMapChannel {
	id?: EntityId;
	eeg_map_id?: EntityId;
	electrode_code: string;
	channel_number: number | null;
	display_order: number;
	is_active?: boolean;
}

export interface EegMap {
	id: EntityId;
	name: string;
	layout_type: '10-10' | '10-20' | string;
	description?: string | null;
	created_at?: string;
	updated_at?: string;
	channels: EegMapChannel[];
}

export interface ExperimentPlan {
	id: EntityId;
	subject_id?: EntityId | null;
	owner_id: EntityId;
	create_at?: string;
	name?: string | null;
	description?: string | null;
	eeg_map_id?: EntityId | null;
	eight_channels_map_id?: number | null;
	other_eight_channels_map_id?: number | null;
	eeg_map?: EegMap | null;
}

export interface ExperimentPlanDetail {
	plan: ExperimentPlan;
	owner?: AuthUser | null;
	steps: ExperimentStep[];
	data_files: ExperimentData[];
	eeg_map?: EegMap | null;
}

export interface ExperimentPlanCreatePayload {
	subject_id: EntityId;
	owner_id: EntityId;
	name?: string | null;
	description?: string | null;
	eeg_map_id?: EntityId | null;
}

export interface ExperimentPlanUpdatePayload {
	owner_id?: EntityId;
	name?: string | null;
	description?: string | null;
	eeg_map_id?: EntityId | null;
}

export interface EegMapUpsertPayload {
	name: string;
	layout_type: '10-10' | '10-20' | string;
	description?: string | null;
	channels: EegMapChannel[];
}
