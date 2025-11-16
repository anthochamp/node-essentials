import type { AsyncCallable } from "../ecma/function/types.js";
import { waitFor } from "../ecma/function/wait-for.js";
import { defaults } from "../ecma/object/defaults.js";
import { isNodeErrorWithCode } from "../node/error/node-error.js";
import { DgramSocket } from "../node/net/dgram-socket.js";
import { type ILockable, LockNotAcquiredError } from "./ilockable.js";
import { LockableBase } from "./lockable-base.js";

export type UdpBindLockConfig = {
	/**
	 * The type of UDP socket to create, either "udp4" for IPv4 or "udp6" for IPv6.
	 *
	 * It should match the IP version of the `udpBindAddress`.
	 */
	udpSocketType: "udp4" | "udp6";

	/**
	 * The address to bind the UDP socket to.
	 * Default is "localhost"
	 *
	 * Example: "localhost" or "127.1.2.3" (in which case `udpSocketType` should be
	 * "udp4") or "::1" (in which case `udpSocketType` should be "udp6").
	 *
	 * Note: Using "localhost" is generally safe as it resolves to both IPv4 and
	 * IPv6 loopback addresses, but if you want to be certain about the IP version,
	 * specify the address explicitly.
	 */
	udpBindAddress?: string | null;

	/**
	 * The port to bind the UDP socket to.
	 *
	 * Should be a port that is unlikely to be used by other applications.
	 */
	udpBindPort: number;
};

export type UdpBindLockOptions = {
	/**
	 * Optional polling interval in milliseconds to check if the lock is still held.
	 * Default is 100 ms.
	 */
	pollIntervalMs?: number;
};

const UDP_BIND_LOCK_DEFAULT_OPTIONS: Required<UdpBindLockOptions> = {
	pollIntervalMs: 100,
};

/**
 * A class that provides a mechanism to ensure that only one instance of a process
 * is running at a time by attempting to bind to a specific UDP port.
 *
 * This is useful for preventing multiple instances of a script or application
 * from running simultaneously.
 *
 * Note: The lock is automatically released when the process exits, but it is
 * recommended to call `release` explicitly when the lock is no longer needed.
 *
 * Example usage:
 * ```ts
 * const lock = new UdpBindLock({
 *   udpSocketType: "udp4",
 *   udpBindPort: 12345,
 * });
 *
 * const acquired = await lock.tryAcquire();
 * if (!acquired) {
 *   console.error("Another instance is already running.");
 *   process.exit(1);
 * }
 *
 * // ... application logic ...
 *
 * await lock.release();
 * ```
 */
export class UdpBindLock extends LockableBase implements ILockable {
	private readonly options: Required<UdpBindLockOptions>;
	private udpSocket: DgramSocket | null = null;

	constructor(
		private readonly config: UdpBindLockConfig,
		options?: UdpBindLockOptions,
	) {
		super();

		this.options = defaults(options, UDP_BIND_LOCK_DEFAULT_OPTIONS);
	}

	get locked(): boolean {
		return this.udpSocket !== null;
	}

	async acquire(signal?: AbortSignal | null): Promise<AsyncCallable> {
		await waitFor(
			async () => {
				const udpSocket = DgramSocket.from({
					type: this.config.udpSocketType,
					signal: signal ?? undefined,
				});

				// Prevent the socket from keeping the Node.js process alive
				udpSocket.unref();

				try {
					await udpSocket.bind(
						this.config.udpBindPort,
						this.config.udpBindAddress ?? undefined,
						{
							exclusive: true,
						},
					);
				} catch (error) {
					if (isNodeErrorWithCode(error, "EADDRINUSE")) {
						return false;
					}

					throw error;
				}

				this.udpSocket = udpSocket;
				return true;
			},
			{
				intervalMs: this.options.pollIntervalMs,
				signal,
			},
		);

		return () => this.release();
	}

	async release(): Promise<void> {
		if (!this.udpSocket) {
			throw new LockNotAcquiredError();
		}

		await this.udpSocket.close();
		this.udpSocket = null;
	}
}
