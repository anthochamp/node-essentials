import * as net from "node:net";
import type { Except } from "type-fest";
import { EventDispatcherMapBase } from "../../async/events/_event-dispatcher-map-base.js";
import type { IEventDispatcherMap } from "../../async/events/ievent-dispatcher-map.js";
import type { IError } from "../../ecma/error/error.js";
import { UnsupportedError } from "../../ecma/error/unsupported-error.js";
import { composeInetAddress, type InetEndpoint } from "./inet.js";
import { TcpSocket } from "./tcp-socket.js";

/**
 * Event map for TcpServer server-specific events.
 */
export type TcpServerEvents = {
	/**
	 * Emitted when the server closes.
	 */
	close: [];

	/**
	 * Emitted when a new connection is made.
	 * The connection is wrapped in a TcpClient instance.
	 */
	connection: [client: TcpSocket];

	/**
	 * Emitted when a new connection is dropped.
	 * Provides the local and remote endpoint information of the dropped connection.
	 */
	drop: [
		localEndpoint: InetEndpoint | null,
		remoteEndpoint: InetEndpoint | null,
	];

	/**
	 * Emitted when an error occurs.
	 */
	error: [err: IError];

	/**
	 * Emitted when the server has been bound after calling server.listen().
	 */
	listening: [];
};

/**
 * TCP server to accept incoming connections.
 *
 * Example usage:
 * ```ts
 * const server = TcpServer.from();
 * server.on("connection", (client) => {
 *   console.log("Client connected");
 *   client.stream.on("data", (data) => {
 *     console.log("Received:", data.toString());
 *   });
 * });
 * await server.listen(8080, "0.0.0.0");
 * // ... later
 * await server.close();
 * ```
 */
export class TcpServer
	extends EventDispatcherMapBase<TcpServerEvents>
	implements IEventDispatcherMap<TcpServerEvents>
{
	/**
	 * Creates a new `TcpServer` instance with the specified options.
	 *
	 * @param options Options for creating the TCP server.
	 * @returns A new `TcpServer` instance.
	 */
	static from(options?: net.ServerOpts): TcpServer {
		return new TcpServer(net.createServer(options));
	}

	private readonly handledErrorEvents: Set<IError> = new Set();

	constructor(private readonly srv: net.Server) {
		super();
		this.setupEventForwarding();
	}

	/**
	 * Gets the current number of concurrent connections on the server.
	 *
	 * @returns A promise that resolves with the connection count.
	 */
	getConnections(): Promise<number> {
		return new Promise((resolve, reject) => {
			this.srv.getConnections((error, count) => {
				if (error) {
					reject(error);
				} else {
					resolve(count);
				}
			});
		});
	}

	/**
	 * Gets whether the server is currently listening for connections.
	 */
	get listening(): boolean {
		return this.srv.listening;
	}

	/**
	 * Sets the maximum number of queued pending connections.
	 *
	 * @param maxConnections The maximum number of connections to queue.
	 */
	set maxConnections(maxConnections: number) {
		this.srv.maxConnections = maxConnections;
	}

	/**
	 * Gets the maximum number of queued pending connections.
	 */
	get maxConnections(): number {
		return this.srv.maxConnections;
	}

	/**
	 * References the server, preventing the process from exiting while the server is active.
	 */
	ref(): void {
		this.srv.ref();
	}

	/**
	 * Unreferences the server, allowing the process from exiting even if the server is active.
	 */
	unref(): void {
		this.srv.unref();
	}

	/**
	 * Starts the TCP server listening on the specified port and host.
	 *
	 * @param port The port to listen on. If 0, a random available port will be assigned.
	 * @param host The host/interface to bind to. Defaults to '::' (IPv6) or '0.0.0.0' (IPv4).
	 * @param options Additional listen options.
	 * @returns A promise that resolves when the server is successfully listening.
	 */
	listen(
		port: number,
		host?: string,
		options?: Except<net.ListenOptions, "port" | "host">,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			this.srv.prependOnceListener("error", handleError);

			this.srv.listen(
				{
					...options,
					port,
					host,
				},
				() => {
					this.srv.removeListener("error", handleError);
					resolve();
				},
			);
		});
	}

	/**
	 * Closes the TCP server, stopping it from accepting new connections.
	 * Existing connections are not automatically closed.
	 *
	 * @returns A promise that resolves when the server is fully closed.
	 */
	close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.srv.close((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Gets the address information of the server.
	 *
	 * @returns The server's endpoint information or null if the server is not listening.
	 */
	address(): InetEndpoint | null {
		const addr = this.srv.address();

		if (addr === null) {
			return null;
		}

		if (typeof addr === "string") {
			throw new UnsupportedError(
				`Unsupported address type: string. Expected AddressInfo object.`,
			);
		}

		return {
			...composeInetAddress(addr.family, addr.address),
			port: addr.port,
		};
	}

	private setupEventForwarding(): void {
		this.srv.on("connection", (socket) => {
			const client = new TcpSocket(socket);
			this.dispatch("connection", client);
		});

		this.srv.on("close", () => {
			this.dispatch("close");
		});

		this.srv.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.dispatch("error", err);
		});

		this.srv.on("listening", () => {
			this.dispatch("listening");
		});

		this.srv.on("drop", (data?) => {
			let localEndpoint: InetEndpoint | null;
			if (
				data?.localAddress !== undefined &&
				data?.localPort !== undefined &&
				data?.localFamily !== undefined
			) {
				localEndpoint = {
					...composeInetAddress(data.localFamily, data.localAddress),
					port: data.localPort,
				};
			} else {
				localEndpoint = null;
			}

			let remoteEndpoint: InetEndpoint | null;
			if (
				data?.remoteAddress !== undefined &&
				data?.remotePort !== undefined &&
				data?.remoteFamily !== undefined
			) {
				remoteEndpoint = {
					...composeInetAddress(data.remoteFamily, data.remoteAddress),
					port: data.remotePort,
				};
			} else {
				remoteEndpoint = null;
			}

			this.dispatch("drop", localEndpoint, remoteEndpoint);
		});
	}
}
