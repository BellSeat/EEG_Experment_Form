import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { auth } from './auth';
import type {
	ApiListResponse,
	AuditLogEntry,
	AuthUser,
	EntityId,
	EegMap,
	EegMapUpsertPayload,
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
	LoginRequest,
	LoginResponse,
	Session,
	SessionCreatePayload,
	SessionFile,
	SessionFileUploadPayload,
	SessionFileUpdatePayload,
	SessionUpdatePayload,
	Subject,
	SubjectCreatePayload,
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
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new ApiError(await parseErrorMessage(response), response.status);
	}

	return normalizeLoginResponse((await response.json()) as RawLoginResponse);
}

export async function getSubjects(): Promise<ApiListResponse<Subject>> {
	return normalizeListResponse(await apiFetch<ListPayload<Subject>>('/subjects'));
}

export async function createSubject(payload: SubjectCreatePayload): Promise<Subject> {
	return apiJson<Subject>('/subjects', 'POST', payload);
}

export async function getSessions(): Promise<ApiListResponse<Session>> {
	return normalizeListResponse(await apiFetch<ListPayload<Session>>('/sessions'));
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

export async function getSessionFiles(sessionId?: EntityId): Promise<ApiListResponse<SessionFile>> {
	const path = sessionId === undefined ? '/session_files' : `/sessions/${sessionId}/files`;
	return normalizeListResponse(await apiFetch<ListPayload<SessionFile>>(path));
}

export async function getAllSessionFiles(): Promise<ApiListResponse<SessionFile>> {
	try {
		const response = await getSessionFiles();
		if (response.items.length > 0) {
			return response;
		}
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 404) {
			throw error;
		}
	}

	const sessions = await getSessions();
	const fileLists = await Promise.all(
		sessions.items.map(async (session) => {
			try {
				const response = await getSessionFiles(session.id);
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
	return {
		items,
		total: items.length,
	};
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
	sessionId?: EntityId,
): Promise<SessionFile> {
	try {
		return await apiJson<SessionFile>(`/session_files/${fileId}`, 'PUT', payload);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404 && sessionId !== undefined) {
			return apiJson<SessionFile>(`/sessions/${sessionId}/files/${fileId}`, 'PUT', payload);
		}
		throw error;
	}
}

export async function deleteSessionFile(fileId: EntityId, sessionId?: EntityId): Promise<void> {
	try {
		return await apiJson<void>(`/session_files/${fileId}`, 'DELETE');
	} catch (error) {
		if (error instanceof ApiError && error.status === 404 && sessionId !== undefined) {
			return apiJson<void>(`/sessions/${sessionId}/files/${fileId}`, 'DELETE');
		}
		throw error;
	}
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

export async function getExperimentPlans(): Promise<ApiListResponse<ExperimentPlan>> {
	return normalizeListResponse(await apiFetch<ListPayload<ExperimentPlan>>('/experiment-plans'));
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
	try {
		const response = await getExperimentData();
		if (response.items.length > 0) {
			return response;
		}
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 404) {
			throw error;
		}
	}

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
	return {
		items,
		total: items.length,
	};
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
