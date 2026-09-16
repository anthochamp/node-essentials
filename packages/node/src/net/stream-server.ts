import * as net from "node:net";

import { EventDispatcherMapBase, IEventDispatcherMap } from "@ac-kit/async";
import { type IError } from "@ac-kit/core";

/** Event map for {@link StreamServer} lifecycle events. */
export type StreamServerEvents = {
	/** Emitted once the server stopped listening and all connections ended. */
	close: [];

	/** Emitted when an error occurs on the server. */
	error: [error: IError];

	/** Emitted once the server is bound and accepting connections. */
	listening: [];
};

/**
 * Base class for stream-oriented servers.
 *
 * This abstraction wraps a {@link net.Server} instance and exposes the lifecycle
 * that is independent of the transport: binding state, connection accounting,
 * event-loop referencing and closing.
 *
 * Binding and address reporting are transport-specific and are added by the
 * concrete subclasses {@link TcpServer} and {@link IpcServer}, as is the
 * "connection" event, whose payload is a socket of the matching type.
 */
export class StreamServer<
	TServer extends net.Server = net.Server,
	TEvents extends StreamServerEvents = StreamServerEvents,
>
	extends EventDispatcherMapBase<TEvents>
	implements IEventDispatcherMap<TEvents>
{
	protected readonly handledErrorEvents: Set<IError> = new Set();

	/**
	 * Creates a new {@link StreamServer} instance.
	 *
	 * @param server The underlying Node.js server.
	 */
	constructor(protected readonly server: TServer) {
		super();
		this.setupEventForwarding();
	}

	/** Whether the server is currently listening for connections. */
	get listening(): boolean {
		return this.server.listening;
	}

	/** Maximum number of concurrent connections accepted by the server. */
	get maxConnections(): number {
		return this.server.maxConnections;
	}

	/**
	 * Updates the maximum number of concurrent connections.
	 *
	 * Connections accepted beyond this limit are dropped.
	 */
	set maxConnections(maxConnections: number) {
		this.server.maxConnections = maxConnections;
	}

	/**
	 * Counts the connections currently handled by the server.
	 *
	 * @returns A promise that resolves with the connection count.
	 */
	getConnections(): Promise<number> {
		return new Promise((resolve, reject) => {
			this.server.getConnections((error, count) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(count);
			});
		});
	}

	/**
	 * Marks the server as referenced, preventing the Node.js process from exiting
	 * while it is listening.
	 */
	ref(): void {
		this.server.ref();
	}

	/**
	 * Marks the server as unreferenced, allowing the Node.js process to exit even
	 * while it is listening.
	 */
	unref(): void {
		this.server.unref();
	}

	/**
	 * Stops the server from accepting new connections. Established connections
	 * are not closed; the promise resolves once the last of them ends.
	 *
	 * @returns A promise that resolves when the server is fully closed.
	 * @throws When the server was not listening.
	 */
	close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	/**
	 * Binds the server and resolves once it is listening.
	 *
	 * The bind error is consumed rather than dispatched, so that a rejected
	 * promise is not also reported as an unhandled "error" event.
	 *
	 * @param options The listen options to bind with. Without any, the server
	 *   binds a system-assigned port on every interface.
	 * @returns A promise that resolves once the server is listening.
	 */
	protected listenOn(options?: net.ListenOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			this.server.prependOnceListener("error", handleError);

			this.server.listen(options ?? {}, () => {
				this.server.removeListener("error", handleError);
				resolve();
			});
		});
	}

	protected setupEventForwarding(): void {
		this.server.on("close", () => {
			this.dispatch("close", []);
		});

		this.server.on("error", (error) => {
			if (this.handledErrorEvents.has(error)) {
				this.handledErrorEvents.delete(error);
				return;
			}
			this.dispatch("error", [error]);
		});

		this.server.on("listening", () => {
			this.dispatch("listening", []);
		});
	}
}
