import * as net from "node:net";

import { UnsupportedError } from "@ac-kit/core";
import type { Except } from "type-fest";

import { IpcSocket } from "./ipc-socket.js";
import { StreamServer, type StreamServerEvents } from "./stream-server.js";

/** Event map for {@link IpcServer}. */
export type IpcServerEvents = StreamServerEvents & {
	/** Emitted when a new connection is accepted. */
	connection: [socket: IpcSocket];
};

/** Options accepted by {@link IpcServer.from}. */
export type IpcServerOptions = net.ServerOpts;

/** Options accepted by {@link IpcServer.listen}. */
export type IpcServerListenOptions = Except<
	net.ListenOptions,
	"port" | "host" | "path" | "handle" | "ipv6Only" | "reusePort"
>;

/**
 * Server accepting connections on a Unix domain socket or a Windows named pipe.
 *
 * Example usage:
 *
 * ```ts
 * const server = IpcServer.from();
 * server.subscribe("connection", (socket) => {
 * 	socket.stream.on("data", (data) => {
 * 		console.log("Received:", data.toString());
 * 	});
 * });
 * await server.listen("/var/run/app.sock");
 * // ... later
 * await server.close();
 * ```
 *
 * On Unix the socket file is removed when the server closes, but not when the
 * process exits abnormally: a stale file makes the next bind fail with
 * `EADDRINUSE`.
 */
export class IpcServer extends StreamServer<net.Server, IpcServerEvents> {
	/**
	 * Creates a new {@link IpcServer} instance.
	 *
	 * @param options Options for creating the underlying Node.js server.
	 * @returns A new `IpcServer` instance.
	 */
	static from(options?: IpcServerOptions): IpcServer {
		return new IpcServer(net.createServer(options));
	}

	/**
	 * Binds the server to the given path and resolves once it is listening.
	 *
	 * @param path Filesystem path of the Unix domain socket, or the name of the
	 *   Windows named pipe.
	 * @param options Additional listen options.
	 * @returns A promise that resolves once the server is listening.
	 * @throws When the path is already in use or cannot be bound.
	 */
	listen(path: string, options?: IpcServerListenOptions): Promise<void> {
		return this.listenOn({
			...options,
			path,
		});
	}

	/**
	 * Returns the path the server is bound to.
	 *
	 * @returns The bound path, or `null` when the server is not listening.
	 * @throws {UnsupportedError} When the server is bound to an IP endpoint
	 *   rather than a path. Use {@link TcpServer} for those.
	 */
	address(): string | null {
		const address = this.server.address();

		if (address === null) {
			return null;
		}

		if (typeof address !== "string") {
			throw new UnsupportedError(
				`Unsupported address type: AddressInfo. Expected a path string.`,
			);
		}

		return address;
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.server.on("connection", (socket) => {
			this.dispatch("connection", [new IpcSocket(socket)]);
		});
	}
}
