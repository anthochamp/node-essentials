import * as net from "node:net";
import type * as stream from "node:stream";
import { EventDispatcherMapBase } from "../../async/events/_event-dispatcher-map-base.js";
import type { IEventDispatcherMap } from "../../async/events/ievent-dispatcher-map.js";
import type { IError } from "../../ecma/error/error.js";

/**
 * Event map for {@link StreamSocket} lifecycle events.
 *
 * These correspond to the core {@link net.Socket} events that are
 * meaningful for any stream-oriented connection, regardless of the
 * underlying transport (TCP, Unix domain socket, etc.).
 */
export type StreamSocketEvents = {
	/**
	 * Emitted when an error occurs on the underlying socket.
	 *
	 * After this event the implementation will typically attempt to
	 * close the socket and then emit {@link StreamSocketEvents.close}.
	 */
	error: [error: IError];

	/**
	 * Emitted once the socket has been fully closed.
	 *
	 * After this event the socket is no longer usable.
	 */
	close: [hadError: boolean];

	/**
	 * Emitted when the socket connection is successfully established.
	 *
	 * This maps to the underlying {@link net.Socket} "connect" event.
	 */
	connect: [];

	/**
	 * Emitted when the socket is ready for I/O.
	 *
	 * On Node.js this is typically fired immediately after "connect",
	 * once the internal initialization is complete.
	 */
	ready: [];

	/**
	 * Emitted if the socket times out from inactivity.
	 *
	 * The underlying connection is not automatically closed; it is up to
	 * the caller to decide whether to end or destroy the socket.
	 */
	timeout: [];
};

/**
 * Base class for stream-oriented client sockets.
 *
 * This abstraction wraps a {@link net.Socket} instance and exposes:
 *
 * - A stable, duplex {@link stream} for reading and writing data.
 * - Common lifecycle properties such as {@link closed},
 *   {@link destroyed}, {@link bytesRead}, {@link bytesWritten} and
 *   {@link connecting}.
 * - Timeout management via the {@link timeout} property.
 * - Promise-based {@link end} and {@link write} helpers.
 * - Strongly-typed lifecycle events via {@link StreamSocketEvents}.
 *
 * It is intentionally transport-agnostic: it does not assume a
 * particular address family or protocol. Concrete subclasses such as
 * {@link TcpClient} add protocol-specific concerns (for example
 * `InetEndpoint` accessors, TCP keep-alive configuration, or DNS
 * resolution events) on top of this base.
 *
 * Unless explicitly documented otherwise, methods mirror the semantics
 * of their underlying {@link net.Socket} counterparts.
 */
export class StreamSocket<
		TSock extends net.Socket = net.Socket,
		TEvents extends StreamSocketEvents = StreamSocketEvents,
	>
	extends EventDispatcherMapBase<TEvents>
	implements IEventDispatcherMap<TEvents>
{
	protected readonly handledErrorEvents: Set<IError> = new Set();

	/**
	 * Creates a new {@link StreamSocket} instance.
	 *
	 * @param options Options for creating the underlying Node.js socket.
	 * @returns A new `StreamSocket` instance.
	 */
	static from(options?: net.SocketConstructorOpts): StreamSocket {
		return new StreamSocket(new net.Socket(options));
	}

	/**
	 * Creates a new {@link StreamSocket} instance.
	 *
	 * @param sock The underlying Node.js socket.
	 */
	constructor(protected readonly sock: TSock) {
		super();
		this.setupEventForwarding();
	}

	/**
	 * Underlying duplex stream for reading and writing data.
	 *
	 * This is the wrapped {@link net.Socket} instance and can be passed
	 * directly to APIs that expect a Node.js stream.
	 */
	get stream(): stream.Duplex {
		return this.sock;
	}

	/**
	 * Indicates whether the socket has been fully closed.
	 */
	get closed(): boolean {
		return this.sock.closed;
	}

	/**
	 * Indicates whether the underlying socket has been destroyed.
	 */
	get destroyed(): boolean {
		return this.sock.destroyed;
	}

	/**
	 * Total number of bytes read from the socket so far.
	 */
	get bytesRead(): number {
		return this.sock.bytesRead;
	}

	/**
	 * Total number of bytes written to the socket so far.
	 */
	get bytesWritten(): number {
		return this.sock.bytesWritten;
	}

	/**
	 * Whether the socket is currently in the process of connecting.
	 */
	get connecting(): boolean {
		return this.sock.connecting;
	}

	/**
	 * Current inactivity timeout in milliseconds, or `null` if disabled.
	 */
	get timeout(): number | null {
		return this.sock.timeout ?? null;
	}

	/**
	 * Updates the inactivity timeout for the socket.
	 *
	 * When set to a positive number, the socket emits a "timeout" event
	 * if no I/O activity occurs within the given number of milliseconds.
	 * A value of `0` or `null` disables the timeout entirely.
	 */
	set timeout(timeout: number | null) {
		this.sock.setTimeout(timeout ?? 0);
	}

	/**
	 * Marks the socket as referenced, preventing the Node.js process from
	 * exiting while the socket is active.
	 */
	ref(): void {
		this.sock.ref();
	}

	/**
	 * Marks the socket as unreferenced, allowing the Node.js process to
	 * exit even if the socket is still active.
	 */
	unref(): void {
		this.sock.unref();
	}

	/**
	 * Half-closes the socket, optionally waiting for a full close.
	 *
	 * If `waitForClose` is omitted or `false`, the promise resolves once
	 * the local side has finished sending data and the FIN has been
	 * queued. When `waitForClose` is `true`, the promise resolves only
	 * after the remote side has also closed and the "close" event has
	 * fired.
	 *
	 * @param options Optional settings for ending the socket.
	 * @returns A promise that resolves once the socket has ended.
	 */
	end(options?: { waitForClose?: boolean }): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			const handleEnd = () => {
				this.sock.removeListener("error", handleError);
				resolve();
			};

			this.sock.prependOnceListener("error", handleError);

			if (options?.waitForClose && !this.sock.closed) {
				this.sock.prependOnceListener("close", () => {
					this.sock.removeListener("error", handleError);
					resolve();
				});
			}

			this.sock.end(
				options?.waitForClose && !this.sock.closed ? undefined : handleEnd,
			);
		});
	}

	/**
	 * Writes data to the socket and resolves once the write completes.
	 *
	 * @param data The data to write
	 * @param options Optional encoding if `data` is a string.
	 */
	write(data: Uint8Array): Promise<void> {
		return new Promise((resolve, reject) => {
			const callback = (error?: IError | null) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			};

			// TODO: Handle backpressure
			this.sock.write(data, callback);
		});
	}

	/**
	 * Immediately destroys the underlying socket.
	 *
	 * Pending I/O is discarded, the connection is closed and the socket
	 * transitions to a terminal state. Any registered "close" listeners
	 * will still be invoked.
	 */
	destroy(): void {
		this.sock.destroy();
	}

	protected setupEventForwarding(): void {
		this.sock.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.dispatch("error", err as IError);
		});

		this.sock.on("close", (hadError) => {
			this.dispatch("close", Boolean(hadError));
		});

		this.sock.on("connect", () => {
			this.dispatch("connect");
		});

		this.sock.on("ready", () => {
			this.dispatch("ready");
		});

		this.sock.on("timeout", () => {
			this.dispatch("timeout");
		});
	}
}
