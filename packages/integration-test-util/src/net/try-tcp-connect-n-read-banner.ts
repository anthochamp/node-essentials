import { createInterface } from "node:readline";

import { TcpSocket, TcpSocketConnectOptions } from "@ac-kit/node";

/**
 * Connects to port, reads the first line, and returns whether it starts with
 * bannerPrefix. Returns false on any connection or read error, or on abort.
 *
 * Note: This function does not support reading multi-line banners. It only
 * reads the first line.
 *
 * @param port The TCP port to connect to.
 * @param bannerPrefix The expected prefix of the banner.
 * @param options Optional parameters including connection options and an abort
 *   signal.
 * @returns A promise that resolves to true if the banner starts with the
 *   specified prefix, false otherwise.
 */
export async function tryTcpConnectAndReadBanner(
	port: number,
	bannerPrefix: string,
	connectOptions?: TcpSocketConnectOptions,
): Promise<boolean> {
	const socket = TcpSocket.from();
	try {
		await socket.connect(port, connectOptions);
		const rl = createInterface({
			input: socket.stream,
			crlfDelay: Infinity,
			signal: connectOptions?.signal,
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
		socket.destroy();
	}
}
