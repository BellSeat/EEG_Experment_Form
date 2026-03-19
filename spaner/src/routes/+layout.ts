import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { auth } from '$lib/auth';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	if (!browser) {
		return;
	}

	const { token } = get(auth);

	if (token && url.pathname === '/') {
		throw redirect(303, '/dashboard');
	}
};
