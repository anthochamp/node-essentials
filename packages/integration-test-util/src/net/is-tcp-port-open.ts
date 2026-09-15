import { createConnection } from "node:net";

/**
 * Test if a TCP port is open on a given host.
 *
 * @param port - The TCP port to test.
 * @param host - The host to test the port on. Defaults to `localhost`.
 * @returns A promise that resolves to `true` if the port is open, or `false` if
 *   it is closed or unreachable.
 */
export function isTcpPortOpen(port: number, host?: string): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = createConnection({ host, port });
		socket.once("connect", () => {
			socket.destroy();
			resolve(true);
		});
		socket.once("error", () => resolve(false));
	});
}
