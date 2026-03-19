import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { auth } from '$lib/auth';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = ({ url }) => {
	if (!browser) {
		return;
	}

	const { token } = get(auth);

	if (!token) {
		throw redirect(303, '/');
	}

	return {
		pathname: url.pathname,
	};
};
