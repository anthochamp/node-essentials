/**
 * Test if an HTTP(S) URL is available by performing a HEAD request.
 *
 * @param url The URL to test.
 * @param signal An optional AbortSignal to cancel the request.
 * @returns A promise that resolves to `true` if the URL is available, `false` otherwise.
 */
export async function isHttpAvailable(
	url: string | URL,
	signal?: AbortSignal | null,
): Promise<boolean> {
	try {
		await fetch(url, {
			method: "HEAD",
			redirect: "manual",
			keepalive: false,
			cache: "no-cache",
			mode: "no-cors",
			signal,
		});
		return true;
	} catch (_) {
		return false;
	}
}
