import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const DEFAULT_DEV_PROXY_TARGET = 'http://127.0.0.1:8000';
const DEFAULT_PROD_PROXY_TARGET = 'http://44.246.140.185:8000';
const HOP_BY_HOP_HEADERS = new Set([
	'connection',
	'content-length',
	'host',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade'
]);

function normalizeTarget(value: string): string {
	return value.trim().replace(/\/+$/, '');
}

function getProxyTarget(): string {
	const configuredTarget = normalizeTarget(env.API_PROXY_TARGET ?? '');
	if (configuredTarget) {
		return configuredTarget;
	}

	return dev ? DEFAULT_DEV_PROXY_TARGET : DEFAULT_PROD_PROXY_TARGET;
}

function buildUpstreamUrl(requestUrl: URL, path: string): URL {
	const proxyTarget = new URL(getProxyTarget());
	const targetPathname = [proxyTarget.pathname.replace(/\/+$/, ''), path.replace(/^\/+/, '')]
		.filter(Boolean)
		.join('/');

	proxyTarget.pathname = targetPathname.startsWith('/') ? targetPathname : `/${targetPathname}`;
	proxyTarget.search = requestUrl.search;
	return proxyTarget;
}

function buildUpstreamHeaders(request: Request): Headers {
	const headers = new Headers(request.headers);
	for (const header of HOP_BY_HOP_HEADERS) {
		headers.delete(header);
	}
	return headers;
}

async function proxyRequest({ fetch, params, request, url }: Parameters<RequestHandler>[0]): Promise<Response> {
	const upstreamUrl = buildUpstreamUrl(url, params.path);
	const response = await fetch(upstreamUrl, {
		method: request.method,
		headers: buildUpstreamHeaders(request),
		body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
		redirect: 'manual'
	});

	const headers = new Headers(response.headers);
	for (const header of HOP_BY_HOP_HEADERS) {
		headers.delete(header);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export const GET: RequestHandler = proxyRequest;
export const POST: RequestHandler = proxyRequest;
export const PUT: RequestHandler = proxyRequest;
export const PATCH: RequestHandler = proxyRequest;
export const DELETE: RequestHandler = proxyRequest;
export const OPTIONS: RequestHandler = proxyRequest;
export const HEAD: RequestHandler = proxyRequest;
