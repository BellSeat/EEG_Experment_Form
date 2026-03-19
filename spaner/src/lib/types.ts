export type EntityId = number | string;

export type UserRole = 'admin' | 'researcher' | 'uploader';

export interface AuthUser {
	id: EntityId;
	username: string;
	email: string;
	role: UserRole;
	display_name?: string | null;
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

export interface ApiListResponse<T> {
	items: T[];
	total: number;
	page?: number;
	page_size?: number;
}

export interface Subject {
	id: EntityId;
	code?: string;
	subject_code?: string;
	name?: string;
	status: 'active' | 'inactive' | 'archived' | 'draft';
	notes?: string | null;
	description?: string | null;
	session_count?: number;
	created_at?: string;
	updated_at?: string;
}

export interface SubjectCreatePayload {
	subject_code: string;
	status?: 'active' | 'inactive' | 'archived';
	notes?: string | null;
}

export interface Session {
	id: EntityId;
	subject_id: EntityId;
	experiment_plan_id?: EntityId | null;
	operator_id?: EntityId | null;
	title?: string;
	session_label?: string;
	status: 'planned' | 'recording' | 'processing' | 'completed' | 'archived' | 'in_progress' | 'failed';
	recorded_at?: string | null;
	session_date?: string | null;
	notes?: string | null;
	file_count?: number;
	created_at?: string;
	updated_at?: string;
	subject?: Subject;
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

export interface AuditLogEntry {
	id: EntityId;
	action: string;
	resource_type: string;
	resource_id?: EntityId | null;
	actor?: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'> | null;
	metadata?: Record<string, unknown> | null;
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

export interface SessionUpdatePayload {
	subject_id?: EntityId;
	experiment_plan_id?: EntityId | null;
	operator_id?: EntityId | null;
	session_label?: string;
	session_date?: string;
	status?: Session['status'] | 'in_progress' | 'failed';
	notes?: string | null;
}

export interface SessionCreatePayload {
	subject_id: EntityId;
	experiment_plan_id?: EntityId | null;
	operator_id: EntityId;
	session_label: string;
	session_date: string;
	status?: Session['status'] | 'in_progress' | 'failed';
	notes?: string | null;
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
