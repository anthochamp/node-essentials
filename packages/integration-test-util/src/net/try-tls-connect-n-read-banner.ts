import { createInterface } from "node:readline";

import { TlsSocket, type TlsSocketConnectOptions } from "@ac-kit/node";

/**
 * Connects to port over TLS, reads the first line, and returns whether it
 * starts with bannerPrefix. Returns false on any connection or read error, or
 * on abort.
 *
 * Use with {@link waitFor} from `@ac-kit/core` to poll until ready:
 *
 * ```ts
 * await waitFor(() => tryReadTlsBanner(port, banner), {
 * 	signal: AbortSignal.timeout(30_000),
 * });
 * ```
 */
export async function tryTlsConnectAndReadBanner(
	port: number,
	bannerPrefix: string,
	options?: TlsSocketConnectOptions,
): Promise<boolean> {
	let socket: TlsSocket | undefined;
	try {
		socket = await TlsSocket.connect(port, options);
		const rl = createInterface({
			input: socket.stream,
			crlfDelay: Infinity,
			signal: options?.signal,
		});
		try {
			for await (const line of rl) {
				return line.startsWith(bannerPrefix);
			}
			return false;
		} finally {
			rl.close();
		}
	} catch {
		return false;
	} finally {
		socket?.destroy();
	}
}
