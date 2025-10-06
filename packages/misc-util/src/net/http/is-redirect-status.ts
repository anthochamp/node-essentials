import { HttpStatusCode } from "./types.js";

/**
 * Check if the given HTTP status code is a redirect status code.
 *
 * @see https://fetch.spec.whatwg.org/#statuses
 *
 * @param status HTTP status code
 * @returns true if the status code is a redirect status (301, 302, 303, 307, 308), false otherwise.
 */
export function httpIsRedirectStatus(status: number): boolean {
	return [
		HttpStatusCode.MOVED_PERMANENTLY, // 301
		HttpStatusCode.FOUND, // 302
		HttpStatusCode.SEE_OTHER, // 303
		HttpStatusCode.TEMPORARY_REDIRECT, // 307
		HttpStatusCode.PERMANENT_REDIRECT, // 308
	].includes(status);
}
