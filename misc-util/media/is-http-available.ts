/**
 * Test if an HTTP(S) URL is available by performing a HEAD request.
 *
 * @param url - The URL to test.
 * @param timeoutMs - Optional timeout in milliseconds.
 * @returns A promise that resolves to `true` if the URL is available, `false` otherwise.
 */
export async function isHttpAvailable(
	url: string | URL,
	timeoutMs?: number,
): Promise<boolean> {
	try {
		await fetch(url, {
			method: "HEAD",
			redirect: "manual",
			keepalive: false,
			cache: "no-cache",
			mode: "no-cors",
			signal:
				timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
		});
		return true;
	} catch (_) {
		return false;
	}
}
