import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import type { AuthState, AuthUser } from './types';

const STORAGE_KEY = 'auth';

function safeReadStorage(storage: Storage | undefined): AuthState | null {
	if (!storage) {
		return null;
	}

	const stored = storage.getItem(STORAGE_KEY);
	if (!stored) {
		return null;
	}

	try {
		const parsed = JSON.parse(stored) as Partial<AuthState>;
		return {
			token: typeof parsed.token === 'string' ? parsed.token : null,
			user: parsed.user ?? null,
			remember: Boolean(parsed.remember),
		};
	} catch {
		storage.removeItem(STORAGE_KEY);
		return null;
	}
}

function readInitialState(): AuthState {
	if (!browser) {
		return { token: null, user: null, remember: false };
	}

	return (
		safeReadStorage(window.localStorage) ??
		safeReadStorage(window.sessionStorage) ?? {
			token: null,
			user: null,
			remember: false,
		}
	);
}

function persistState(state: AuthState) {
	if (!browser) {
		return;
	}

	window.localStorage.removeItem(STORAGE_KEY);
	window.sessionStorage.removeItem(STORAGE_KEY);

	if (!state.token) {
		return;
	}

	const storage = state.remember ? window.localStorage : window.sessionStorage;
	storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createAuthStore() {
	const { subscribe, set } = writable<AuthState>(readInitialState());

	return {
		subscribe,
		login(token: string, user: AuthUser, remember = false) {
			const nextState: AuthState = { token, user, remember };
			persistState(nextState);
			set(nextState);
		},
		logout() {
			persistState({ token: null, user: null, remember: false });
			set({ token: null, user: null, remember: false });
		},
		reset() {
			persistState({ token: null, user: null, remember: false });
			set({ token: null, user: null, remember: false });
		},
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, ($auth) => Boolean($auth.token));
export const currentUser = derived(auth, ($auth) => $auth.user);
