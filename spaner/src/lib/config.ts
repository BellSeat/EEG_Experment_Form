import { env } from '$env/dynamic/public';

const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_REGISTRATION_INVITATION_CODE = 'UWBSPANER@BUNNY';

function normalizeUrlValue(value: string | undefined): string {
	return (value ?? '').trim().replace(/\/+$/, '');
}

function normalizeStringValue(value: string | undefined): string {
	return (value ?? '').trim();
}

const legacyApiBase = normalizeUrlValue(import.meta.env.VITE_API_BASE);
const publicApiBase = normalizeUrlValue(env.PUBLIC_API_BASE_URL);

export const API_BASE = publicApiBase || legacyApiBase || DEFAULT_API_BASE_URL;

const legacyInvitationCode = normalizeStringValue(import.meta.env.VITE_REGISTRATION_INVITATION_CODE);
const publicInvitationCode = normalizeStringValue(env.PUBLIC_REGISTRATION_INVITATION_CODE);

export const REGISTRATION_INVITATION_CODE =
	publicInvitationCode || legacyInvitationCode || DEFAULT_REGISTRATION_INVITATION_CODE;
