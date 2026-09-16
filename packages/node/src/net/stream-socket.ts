import * as net from "node:net";
import type * as stream from "node:stream";

import { EventDispatcherMapBase, IEventDispatcherMap } from "@ac-kit/async";
import { type IError } from "@ac-kit/core";

import { ConnectionClosedError } from "./connection-closed-error.js";

/**
 * Event map for {@link StreamSocket} lifecycle events.
 *
 * These correspond to the core {@link net.Socket} events that are meaningful for
 * any stream-oriented connection, regardless of the underlying transport (TCP,
 * Unix domain socket, etc.).
 */
export type StreamSocketEvents = {
	/**
	 * Emitted when an error occurs on the underlying socket.
	 *
	 * After this event the implementation will typically attempt to close the
	 * socket and then emit {@link StreamSocketEvents.close}.
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
	 * On Node.js this is typically fired immediately after "connect", once the
	 * internal initialization is complete.
	 */
	ready: [];

	/**
	 * Emitted if the socket times out from inactivity.
	 *
	 * The underlying connection is not automatically closed; it is up to the
	 * caller to decide whether to end or destroy the socket.
	 */
	timeout: [];
};

/** Options accepted by {@link StreamSocket.from}. */
export type StreamSocketOptions = net.SocketConstructorOpts;

/** Options accepted by {@link StreamSocket.end}. */
export type StreamSocketEndOptions = {
	/**
	 * Waits for the remote side to close as well, instead of resolving as soon as
	 * the local FIN is queued.
	 */
	waitForClose?: boolean;
};

/** Options accepted by {@link StreamSocket.awaitReady}. */
export type StreamSocketAwaitReadyOptions = {
	/** Aborts the attempt, destroying the socket. */
	signal?: AbortSignal;

	/** Starts the attempt, once the settlement listeners are in place. */
	start?: () => void;
};

/**
 * Base class for stream-oriented client sockets.
 *
 * This abstraction wraps a {@link net.Socket} instance and exposes:
 *
 * - A stable, duplex {@link stream} for reading and writing data.
 * - Common lifecycle properties such as {@link closed}, {@link destroyed},
 *   {@link bytesRead}, {@link bytesWritten} and {@link connecting}.
 * - Timeout management via the {@link timeout} property.
 * - Promise-based {@link end} and {@link write} helpers.
 * - Strongly-typed lifecycle events via {@link StreamSocketEvents}.
 *
 * It is intentionally transport-agnostic: it does not assume a particular
 * address family or protocol. Concrete subclasses such as {@link TcpSocket} add
 * protocol-specific concerns (for example `InetEndpoint` accessors, TCP
 * keep-alive configuration, or DNS resolution events) on top of this base.
 *
 * Unless explicitly documented otherwise, methods mirror the semantics of their
 * underlying {@link net.Socket} counterparts.
 */
export class StreamSocket<
	TSocket extends net.Socket = net.Socket,
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
	static from(options?: StreamSocketOptions): StreamSocket {
		return new StreamSocket(new net.Socket(options));
	}

	/**
	 * Creates a new {@link StreamSocket} instance.
	 *
	 * @param socket The underlying Node.js socket.
	 */
	constructor(protected readonly socket: TSocket) {
		super();
		this.setupEventForwarding();
	}

	/**
	 * Underlying duplex stream for reading and writing data.
	 *
	 * This is the wrapped {@link net.Socket} instance and can be passed directly
	 * to APIs that expect a Node.js stream.
	 */
	get stream(): stream.Duplex {
		return this.socket;
	}

	/** Indicates whether the socket has been fully closed. */
	get closed(): boolean {
		return this.socket.closed;
	}

	/** Indicates whether the underlying socket has been destroyed. */
	get destroyed(): boolean {
		return this.socket.destroyed;
	}

	/** Total number of bytes read from the socket so far. */
	get bytesRead(): number {
		return this.socket.bytesRead;
	}

	/** Total number of bytes written to the socket so far. */
	get bytesWritten(): number {
		return this.socket.bytesWritten;
	}

	/** Whether the socket is currently in the process of connecting. */
	get connecting(): boolean {
		return this.socket.connecting;
	}

	/** Current inactivity timeout in milliseconds, or `null` if disabled. */
	get timeout(): number | null {
		return this.socket.timeout ?? null;
	}

	/**
	 * Updates the inactivity timeout for the socket.
	 *
	 * When set to a positive number, the socket emits a "timeout" event if no I/O
	 * activity occurs within the given number of milliseconds. A value of `0` or
	 * `null` disables the timeout entirely.
	 */
	set timeout(timeout: number | null) {
		this.socket.setTimeout(timeout ?? 0);
	}

	/**
	 * Marks the socket as referenced, preventing the Node.js process from exiting
	 * while the socket is active.
	 */
	ref(): void {
		this.socket.ref();
	}

	/**
	 * Marks the socket as unreferenced, allowing the Node.js process to exit even
	 * if the socket is still active.
	 */
	unref(): void {
		this.socket.unref();
	}

	/**
	 * Half-closes the socket, optionally waiting for a full close.
	 *
	 * If `waitForClose` is omitted or `false`, the promise resolves once the
	 * local side has finished sending data and the FIN has been queued. When
	 * `waitForClose` is `true`, the promise resolves only after the remote side
	 * has also closed and the "close" event has fired.
	 *
	 * @param options Optional settings for ending the socket.
	 * @returns A promise that resolves once the socket has ended.
	 */
	end(options?: StreamSocketEndOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				reject(error);
			};
			const handleEnd = () => {
				this.socket.removeListener("error", handleError);
				resolve();
			};

			this.socket.prependOnceListener("error", handleError);

			if (options?.waitForClose && !this.socket.closed) {
				this.socket.prependOnceListener("close", () => {
					this.socket.removeListener("error", handleError);
					resolve();
				});
			}

			this.socket.end(
				options?.waitForClose && !this.socket.closed ? undefined : handleEnd,
			);
		});
	}

	/**
	 * Writes data to the socket and resolves once that chunk has been flushed.
	 *
	 * Awaiting the result is what applies backpressure: the promise settles on
	 * the chunk's own flush rather than on the whole buffer draining, so a
	 * producer that awaits each write never outruns the socket. A caller that
	 * does not await is free to queue without bound.
	 *
	 * @param data The data to write.
	 * @throws When the socket errors or is destroyed before the chunk flushes.
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

			this.socket.write(data, callback);
		});
	}

	/**
	 * Immediately destroys the underlying socket.
	 *
	 * Pending I/O is discarded, the connection is closed and the socket
	 * transitions to a terminal state. Any registered "close" listeners will
	 * still be invoked.
	 */
	destroy(): void {
		this.socket.destroy();
	}

	/**
	 * Runs an operation that establishes the connection and resolves once the
	 * socket emits `readyEvent`.
	 *
	 * The promise always settles: an "error" event rejects it and is consumed so
	 * it is not also dispatched to subscribers, a "close" event without a
	 * preceding error rejects with {@link ConnectionClosedError}, and aborting the
	 * signal destroys the socket and rejects with the abort reason.
	 *
	 * @param readyEvent Underlying socket event signalling a usable connection.
	 * @param options Abort signal and the operation that starts the connection.
	 * @returns A promise that resolves once the connection is established.
	 */
	protected awaitReady(
		readyEvent: string,
		options?: StreamSocketAwaitReadyOptions,
	): Promise<void> {
		const { signal, start } = options ?? {};

		return new Promise<void>((resolve, reject) => {
			const abortListeners = new AbortController();

			const cleanup = () => {
				abortListeners.abort();
				this.socket.removeListener(readyEvent, handleReady);
				this.socket.removeListener("error", handleError);
				this.socket.removeListener("close", handleClose);
			};

			const handleReady = () => {
				cleanup();
				resolve();
			};

			const handleError = (error: IError) => {
				this.handledErrorEvents.add(error);
				cleanup();
				reject(error);
			};

			// A peer that drops the transport mid-connection closes it without an
			// "error"; without this the promise would stay pending forever.
			const handleClose = () => {
				cleanup();
				reject(
					new ConnectionClosedError(
						`Socket closed before the "${readyEvent}" event`,
					),
				);
			};

			if (signal) {
				signal.throwIfAborted();

				signal.addEventListener(
					"abort",
					() => {
						cleanup();
						this.socket.destroy();
						reject(signal.reason);
					},
					{ once: true, signal: abortListeners.signal },
				);
			}

			this.socket.once(readyEvent, handleReady);
			this.socket.prependOnceListener("error", handleError);
			this.socket.once("close", handleClose);

			start?.();
		});
	}

	protected setupEventForwarding(): void {
		this.socket.on("error", (err) => {
			if (this.handledErrorEvents.has(err)) {
				this.handledErrorEvents.delete(err);
				return;
			}
			this.dispatch("error", [err]);
		});

		this.socket.on("close", (hadError) => {
			this.dispatch("close", [hadError]);
		});

		this.socket.on("connect", () => {
			this.dispatch("connect", []);
		});

		this.socket.on("ready", () => {
			this.dispatch("ready", []);
		});

		this.socket.on("timeout", () => {
			this.dispatch("timeout", []);
		});
	}
}
