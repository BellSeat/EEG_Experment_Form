import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { auth } from './auth';
import type {
	ApiListResponse,
	AuditLogEntry,
	AuthUser,
	CollaboratorRole,
	EegMap,
	EegMapUpsertPayload,
	EntityId,
	ExperimentData,
	ExperimentDataCreatePayload,
	ExperimentDataUpdatePayload,
	ExperimentPlan,
	ExperimentPlanCreatePayload,
	ExperimentPlanDetail,
	ExperimentPlanUpdatePayload,
	ExperimentStep,
	ExperimentStepCreatePayload,
	ExperimentStepUpdatePayload,
	InvitationStatus,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	Session,
	SessionCreatePayload,
	SessionFile,
	SessionFileUpdatePayload,
	SessionFileUploadPayload,
	SessionHandoverPayload,
	SessionInvitation,
	SessionInvitationCreatePayload,
	SessionMember,
	SessionMemberCreatePayload,
	SessionMemberUpdatePayload,
	SessionUpdatePayload,
	Subject,
	SubjectCreatePayload,
	SubjectInvitation,
	SubjectInvitationCreatePayload,
	SubjectMember,
	SubjectMemberCreatePayload,
	SubjectMemberUpdatePayload,
	TransferOwnershipPayload,
	UserDirectoryEntry,
	UserRole,
} from './types';

export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export class UnauthorizedError extends ApiError {
	constructor(message = 'Unauthorized') {
		super(message, 401);
		this.name = 'UnauthorizedError';
	}
}

type JsonObject = Record<string, unknown>;

type ListPayload<T> =
	| ApiListResponse<T>
	| T[]
	| {
			items?: T[];
			results?: T[];
			data?: T[];
			total?: number;
			count?: number;
			page?: number;
			page_size?: number;
	  };

type ListEnvelope<T> = {
	items?: T[];
	results?: T[];
	data?: T[];
	total?: number;
	count?: number;
	page?: number;
	page_size?: number;
};

type RawLoginResponse = {
	token?: string;
	access_token?: string;
	token_type?: string;
	expires_in?: number;
	user?: Partial<AuthUser>;
	role?: UserRole;
	username?: string;
	email?: string;
	id?: EntityId;
};

function apiUrl(path: string): string {
	return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

function buildHeaders(token: string | null, headers?: HeadersInit): Headers {
	const merged = new Headers(headers);
	if (token && !merged.has('Authorization')) {
		merged.set('Authorization', `Bearer ${token}`);
	}
	return merged;
}

async function parseErrorMessage(response: Response): Promise<string> {
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const payload = (await response.json().catch(() => ({}))) as JsonObject;
		const detail = payload.detail;
		if (typeof detail === 'string' && detail.trim()) {
			return detail;
		}
	}
	return `HTTP ${response.status}`;
}

async function handleUnauthorized(): Promise<never> {
	auth.logout();
	if (browser) {
		await goto('/');
	}
	throw new UnauthorizedError();
}

function normalizeUser(payload: Partial<AuthUser> | undefined, fallback: RawLoginResponse): AuthUser {
	const rawRole = payload?.role ?? fallback.role;
	const role: UserRole =
		rawRole === 'admin' || rawRole === 'researcher' || rawRole === 'uploader' ? rawRole : 'researcher';

	return {
		id: payload?.id ?? fallback.id ?? fallback.email ?? fallback.username ?? 'unknown',
		username: payload?.username ?? fallback.username ?? fallback.email ?? 'unknown',
		email: payload?.email ?? fallback.email ?? '',
		role,
		display_name: payload?.display_name ?? null,
		global_role: payload?.global_role ?? null,
		status: payload?.status ?? null,
		is_active: payload?.is_active ?? null,
		last_login_at: payload?.last_login_at ?? null,
		created_at: payload?.created_at ?? null,
		updated_at: payload?.updated_at ?? null,
	};
}

function normalizeLoginResponse(payload: RawLoginResponse): LoginResponse {
	const token = payload.token ?? payload.access_token;
	if (!token) {
		throw new ApiError('Login response did not include a token.', 500);
	}

	return {
		token,
		token_type: payload.token_type,
		expires_in: payload.expires_in,
		user: normalizeUser(payload.user, payload),
	};
}

export function normalizeListResponse<T>(payload: ListPayload<T>): ApiListResponse<T> {
	if (Array.isArray(payload)) {
		return { items: payload, total: payload.length };
	}

	const listPayload = payload as ApiListResponse<T> & ListEnvelope<T>;
	const items = listPayload.items ?? listPayload.results ?? listPayload.data ?? [];
	const total = listPayload.total ?? listPayload.count ?? items.length;

	return {
		items,
		total,
		page: listPayload.page,
		page_size: listPayload.page_size,
	};
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const { token } = get(auth);
	const response = await fetch(apiUrl(path), {
		...options,
		headers: buildHeaders(token, options.headers),
	});

	if (response.status === 401) {
		return handleUnauthorized();
	}

	if (!response.ok) {
		throw new ApiError(await parseErrorMessage(response), response.status);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export async function apiJson<T>(
	path: string,
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	body?: unknown,
): Promise<T> {
	const headers = new Headers();
	if (body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}
	return apiFetch<T>(path, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
	const { token } = get(auth);
	const response = await fetch(apiUrl(path), {
		method: 'POST',
		headers: buildHeaders(token),
		body: formData,
	});

	if (response.status === 401) {
		return handleUnauthorized();
	}

	if (!response.ok) {
		throw new ApiError(await parseErrorMessage(response), response.status);
	}

	return (await response.json()) as T;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
	const response = await fetch(apiUrl('/auth/login'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new ApiError(await parseErrorMessage(response), response.status);
	}

	return normalizeLoginResponse((await response.json()) as RawLoginResponse);
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
	const response = await fetch(apiUrl('/auth/register'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new ApiError(await parseErrorMessage(response), response.status);
	}

	if (response.status === 204) {
		return {};
	}

	return (await response.json()) as RegisterResponse;
}

export async function searchUsers(query: string, limit = 20): Promise<UserDirectoryEntry[]> {
	const normalized = query.trim();
	if (!normalized) {
		return [];
	}
	return apiFetch<UserDirectoryEntry[]>(
		`/users/search?q=${encodeURIComponent(normalized)}&limit=${encodeURIComponent(String(limit))}`,
	);
}

export async function getSubjects(): Promise<ApiListResponse<Subject>> {
	return normalizeListResponse(await apiFetch<ListPayload<Subject>>('/subjects'));
}

export async function getSubject(subjectId: EntityId): Promise<Subject> {
	return apiFetch<Subject>(`/subjects/${subjectId}`);
}

export async function createSubject(payload: SubjectCreatePayload): Promise<Subject> {
	return apiJson<Subject>('/subjects', 'POST', payload);
}

export async function getSubjectMembers(subjectId: EntityId): Promise<SubjectMember[]> {
	return apiFetch<SubjectMember[]>(`/subjects/${subjectId}/members`);
}

export async function addSubjectMember(
	subjectId: EntityId,
	payload: SubjectMemberCreatePayload,
): Promise<SubjectMember> {
	return apiJson<SubjectMember>(`/subjects/${subjectId}/members`, 'POST', payload);
}

export async function updateSubjectMember(
	subjectId: EntityId,
	userId: EntityId,
	payload: SubjectMemberUpdatePayload,
): Promise<SubjectMember> {
	return apiJson<SubjectMember>(`/subjects/${subjectId}/members/${userId}`, 'PATCH', payload);
}

export async function deleteSubjectMember(subjectId: EntityId, userId: EntityId): Promise<void> {
	return apiJson<void>(`/subjects/${subjectId}/members/${userId}`, 'DELETE');
}

export async function getSubjectInvitations(
	subjectId: EntityId,
	status?: InvitationStatus,
): Promise<SubjectInvitation[]> {
	const path = status
		? `/subjects/${subjectId}/invitations?status=${encodeURIComponent(status)}`
		: `/subjects/${subjectId}/invitations`;
	return apiFetch<SubjectInvitation[]>(path);
}

export async function createSubjectInvitation(
	subjectId: EntityId,
	payload: SubjectInvitationCreatePayload,
): Promise<SubjectInvitation> {
	return apiJson<SubjectInvitation>(`/subjects/${subjectId}/invitations`, 'POST', payload);
}

export async function transferSubjectOwnership(
	subjectId: EntityId,
	payload: TransferOwnershipPayload,
): Promise<Subject> {
	return apiJson<Subject>(`/subjects/${subjectId}/transfer-ownership`, 'POST', payload);
}

export async function getSessions(subjectId?: EntityId): Promise<ApiListResponse<Session>> {
	const path =
		subjectId === undefined
			? '/sessions'
			: `/sessions?subject_id=${encodeURIComponent(String(subjectId))}`;
	return normalizeListResponse(await apiFetch<ListPayload<Session>>(path));
}

export async function createSession(payload: SessionCreatePayload): Promise<Session> {
	return apiJson<Session>('/sessions', 'POST', payload);
}

export async function getSession(sessionId: EntityId): Promise<Session> {
	return apiFetch<Session>(`/sessions/${sessionId}`);
}

export async function updateSession(sessionId: EntityId, payload: SessionUpdatePayload): Promise<Session> {
	return apiJson<Session>(`/sessions/${sessionId}`, 'PUT', payload);
}

export async function handoverSession(
	sessionId: EntityId,
	payload: SessionHandoverPayload,
): Promise<Session> {
	return apiJson<Session>(`/sessions/${sessionId}/handover`, 'POST', payload);
}

export async function getSessionMembers(sessionId: EntityId): Promise<SessionMember[]> {
	return apiFetch<SessionMember[]>(`/sessions/${sessionId}/members`);
}

export async function addSessionMember(
	sessionId: EntityId,
	payload: SessionMemberCreatePayload,
): Promise<SessionMember> {
	return apiJson<SessionMember>(`/sessions/${sessionId}/members`, 'POST', payload);
}

export async function updateSessionMember(
	sessionId: EntityId,
	userId: EntityId,
	payload: SessionMemberUpdatePayload,
): Promise<SessionMember> {
	return apiJson<SessionMember>(`/sessions/${sessionId}/members/${userId}`, 'PATCH', payload);
}

export async function deleteSessionMember(sessionId: EntityId, userId: EntityId): Promise<void> {
	return apiJson<void>(`/sessions/${sessionId}/members/${userId}`, 'DELETE');
}

export async function getSessionInvitations(
	sessionId: EntityId,
	status?: InvitationStatus,
): Promise<SessionInvitation[]> {
	const path = status
		? `/sessions/${sessionId}/invitations?status=${encodeURIComponent(status)}`
		: `/sessions/${sessionId}/invitations`;
	return apiFetch<SessionInvitation[]>(path);
}

export async function createSessionInvitation(
	sessionId: EntityId,
	payload: SessionInvitationCreatePayload,
): Promise<SessionInvitation> {
	return apiJson<SessionInvitation>(`/sessions/${sessionId}/invitations`, 'POST', payload);
}

async function fetchSessionFilesBySession(sessionId: EntityId): Promise<ApiListResponse<SessionFile>> {
	return normalizeListResponse(await apiFetch<ListPayload<SessionFile>>(`/sessions/${sessionId}/files`));
}

export async function getSessionFiles(sessionId?: EntityId): Promise<ApiListResponse<SessionFile>> {
	if (sessionId === undefined) {
		return getAllSessionFiles();
	}
	return fetchSessionFilesBySession(sessionId);
}

export async function getAllSessionFiles(): Promise<ApiListResponse<SessionFile>> {
	const sessions = await getSessions();
	const fileLists = await Promise.all(
		sessions.items.map(async (session) => {
			try {
				const response = await fetchSessionFilesBySession(session.id);
				return response.items;
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return [];
				}
				throw error;
			}
		}),
	);

	const items = fileLists.flat();
	return { items, total: items.length };
}

export async function uploadSessionFile(
	sessionId: EntityId,
	payload: SessionFileUploadPayload,
): Promise<SessionFile> {
	const formData = new FormData();
	formData.set('file', payload.file);
	formData.set('file_type', payload.file_type);
	formData.set('qc_status', payload.qc_status ?? 'pending');
	formData.set('processing_stage', payload.processing_stage ?? 'raw');
	if (payload.mime_type) {
		formData.set('mime_type', payload.mime_type);
	}
	return apiUpload<SessionFile>(`/sessions/${sessionId}/files`, formData);
}

export async function updateSessionFile(
	fileId: EntityId,
	payload: SessionFileUpdatePayload,
): Promise<SessionFile> {
	return apiJson<SessionFile>(`/session-files/${fileId}`, 'PUT', payload);
}

export async function deleteSessionFile(fileId: EntityId): Promise<void> {
	return apiJson<void>(`/session-files/${fileId}`, 'DELETE');
}

export function resolveStorageUrl(path?: string | null): string | null {
	if (!path) {
		return null;
	}
	if (/^https?:\/\//i.test(path)) {
		return path;
	}
	if (path.startsWith('/')) {
		return `${API_BASE}${path}`;
	}
	return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

export function getSessionFileLink(file: SessionFile): string | null {
	return resolveStorageUrl(file.download_url ?? file.storage_path ?? null);
}

export async function getAuditLog(): Promise<ApiListResponse<AuditLogEntry>> {
	return normalizeListResponse(await apiFetch<ListPayload<AuditLogEntry>>('/audit-log'));
}

export async function createExperimentPlan(
	payload: ExperimentPlanCreatePayload,
): Promise<ExperimentPlan> {
	return apiJson<ExperimentPlan>('/experiment-plans', 'POST', payload);
}

export async function getExperimentPlan(planId: EntityId): Promise<ExperimentPlan> {
	return apiFetch<ExperimentPlan>(`/experiment-plans/${planId}`);
}

export async function getExperimentPlans(subjectId?: EntityId): Promise<ApiListResponse<ExperimentPlan>> {
	const path =
		subjectId === undefined
			? '/experiment-plans'
			: `/experiment-plans?subject_id=${encodeURIComponent(String(subjectId))}`;
	return normalizeListResponse(await apiFetch<ListPayload<ExperimentPlan>>(path));
}

export async function getExperimentPlanDetail(planId: EntityId): Promise<ExperimentPlanDetail> {
	return apiFetch<ExperimentPlanDetail>(`/experiment-plans/${planId}/detail`);
}

export async function updateExperimentPlan(
	planId: EntityId,
	payload: ExperimentPlanUpdatePayload,
): Promise<ExperimentPlan> {
	return apiJson<ExperimentPlan>(`/experiment-plans/${planId}`, 'PUT', payload);
}

export async function createExperimentStep(
	payload: ExperimentStepCreatePayload,
): Promise<ExperimentStep> {
	return apiJson<ExperimentStep>('/experiment-steps', 'POST', payload);
}

export async function updateExperimentStep(
	stepId: EntityId,
	payload: ExperimentStepUpdatePayload,
): Promise<ExperimentStep> {
	return apiJson<ExperimentStep>(`/experiment-steps/${stepId}`, 'PUT', payload);
}

export async function deleteExperimentStep(stepId: EntityId): Promise<void> {
	return apiJson<void>(`/experiment-steps/${stepId}`, 'DELETE');
}

export async function getExperimentData(experimentPlanId?: EntityId): Promise<ApiListResponse<ExperimentData>> {
	const path =
		experimentPlanId === undefined
			? '/experiment-data'
			: `/experiment-data?experiment_plan=${encodeURIComponent(String(experimentPlanId))}`;
	return normalizeListResponse(await apiFetch<ListPayload<ExperimentData>>(path));
}

export async function getAllExperimentData(): Promise<ApiListResponse<ExperimentData>> {
	const sessions = await getSessions();
	const planIds = [
		...new Set(
			sessions.items
				.map((session) => session.experiment_plan_id)
				.filter((planId): planId is EntityId => planId !== null && planId !== undefined),
		),
	];

	const recordLists = await Promise.all(
		planIds.map(async (planId) => {
			try {
				const response = await getExperimentData(planId);
				return response.items;
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return [];
				}
				throw error;
			}
		}),
	);

	const items = [...new Map(recordLists.flat().map((record) => [String(record.id), record])).values()];
	return { items, total: items.length };
}

export async function createExperimentData(
	payload: ExperimentDataCreatePayload,
): Promise<ExperimentData> {
	return apiJson<ExperimentData>('/experiment-data', 'POST', payload);
}

export async function updateExperimentData(
	dataId: EntityId,
	payload: ExperimentDataUpdatePayload,
): Promise<ExperimentData> {
	return apiJson<ExperimentData>(`/experiment-data/${dataId}`, 'PUT', payload);
}

export async function deleteExperimentData(dataId: EntityId): Promise<void> {
	return apiJson<void>(`/experiment-data/${dataId}`, 'DELETE');
}

export async function createEegMap(payload: EegMapUpsertPayload): Promise<EegMap> {
	return apiJson<EegMap>('/eeg-maps', 'POST', payload);
}

export async function getEegMap(mapId: EntityId): Promise<EegMap> {
	return apiFetch<EegMap>(`/eeg-maps/${mapId}`);
}

export async function updateEegMap(mapId: EntityId, payload: EegMapUpsertPayload): Promise<EegMap> {
	return apiJson<EegMap>(`/eeg-maps/${mapId}`, 'PUT', payload);
}

export function roleOptions(): CollaboratorRole[] {
	return ['owner', 'admin', 'editor', 'uploader', 'viewer'];
}
