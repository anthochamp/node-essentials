import * as net from "node:net";

import { UnsupportedError } from "@ac-kit/core";
import type { Except } from "type-fest";

import { toInetAddress } from "./inet-address.js";
import type { InetEndpoint } from "./inet-endpoint.js";
import { StreamServer, type StreamServerEvents } from "./stream-server.js";
import { TcpSocket } from "./tcp-socket.js";

/** Event map for {@link TcpServer}. */
export type TcpServerEvents = StreamServerEvents & {
	/** Emitted when a new connection is accepted. */
	connection: [socket: TcpSocket];

	/**
	 * Emitted when a connection is dropped because
	 * {@link StreamServer.maxConnections} was reached. Each endpoint is `null`
	 * when Node.js did not report it.
	 */
	drop: [
		localEndpoint: InetEndpoint | null,
		remoteEndpoint: InetEndpoint | null,
	];
};

/** Options accepted by {@link TcpServer.from}. */
export type TcpServerOptions = net.ServerOpts;

/** Options accepted by {@link TcpServer.listen}. */
export type TcpServerListenOptions = Except<
	net.ListenOptions,
	"port" | "path" | "handle"
>;

/**
 * TCP server accepting incoming connections.
 *
 * Example usage:
 *
 * ```ts
 * const server = TcpServer.from();
 * server.subscribe("connection", (socket) => {
 * 	socket.stream.on("data", (data) => {
 * 		console.log("Received:", data.toString());
 * 	});
 * });
 * await server.listen(8080, { host: "0.0.0.0" });
 * // ... later
 * await server.close();
 * ```
 */
export class TcpServer<
	TServer extends net.Server = net.Server,
	TEvents extends TcpServerEvents = TcpServerEvents,
> extends StreamServer<TServer, TEvents> {
	/**
	 * Creates a new {@link TcpServer} instance.
	 *
	 * @param options Options for creating the underlying Node.js server.
	 * @returns A new `TcpServer` instance.
	 */
	static from(options?: TcpServerOptions): TcpServer {
		return new TcpServer(net.createServer(options));
	}

	/**
	 * Binds the server and resolves once it is listening.
	 *
	 * @param port The port to listen on. Use `0` to let the system assign one.
	 * @param options Additional listen options.
	 * @returns A promise that resolves once the server is listening.
	 * @throws When the address is already in use or cannot be bound.
	 */
	listen(port: number, options?: TcpServerListenOptions): Promise<void> {
		return this.listenOn({
			...options,
			port,
		});
	}

	/**
	 * Returns the endpoint the server is bound to.
	 *
	 * @returns The bound endpoint, or `null` when the server is not listening.
	 * @throws {UnsupportedError} When the server is bound to a path rather than
	 *   an IP endpoint. Use {@link IpcServer} for those.
	 */
	address(): InetEndpoint | null {
		const address = this.server.address();

		if (address === null) {
			return null;
		}

		if (typeof address === "string") {
			throw new UnsupportedError(
				`Unsupported address type: string. Expected AddressInfo object.`,
			);
		}

		return {
			...toInetAddress(address.family, address.address),
			port: address.port,
		};
	}

	protected override setupEventForwarding(): void {
		super.setupEventForwarding();

		this.server.on("connection", (socket) => {
			this.dispatch("connection", [new TcpSocket(socket)]);
		});

		this.server.on("drop", (data) => {
			const localEndpoint =
				data?.localAddress !== undefined &&
				data.localPort !== undefined &&
				data.localFamily !== undefined
					? {
							...toInetAddress(data.localFamily, data.localAddress),
							port: data.localPort,
						}
					: null;

			const remoteEndpoint =
				data?.remoteAddress !== undefined &&
				data.remotePort !== undefined &&
				data.remoteFamily !== undefined
					? {
							...toInetAddress(data.remoteFamily, data.remoteAddress),
							port: data.remotePort,
						}
					: null;

			this.dispatch("drop", [localEndpoint, remoteEndpoint]);
		});
	}
}
