/**
 * How a transport delivers bytes.
 *
 * - `stream` — an ordered, reliable byte stream with no inherent message
 *   boundaries (TCP, TLS, Unix sockets, a QUIC stream). Received chunks are
 *   accumulated and a value may span any number of them.
 * - `message` — discrete, self-delimiting messages (UDP datagrams). Each delivery
 *   is exactly one value; bytes are never carried across deliveries, and a
 *   message that does not decode completely is truncated rather than
 *   incomplete.
 *
 * The mode changes how a {@link FrameLink} treats an `incomplete` decode
 * result.
 */
export type TransportMode = "stream" | "message";

/**
 * Callbacks a {@link FrameLink} installs on a transport.
 *
 * These are plain function properties rather than events: the link has a single
 * consumer, and this is the hottest path in the stack.
 */
export type TransportHandlers = {
	/**
	 * One chunk (stream mode) or one complete message (message mode) arrived.
	 *
	 * The buffer is owned by the callee for the duration of the call only.
	 */
	data(chunk: Uint8Array): void;

	/** The peer half-closed. No further {@link data} calls will occur. */
	end(): void;

	/** The transport is fully closed and no longer usable. */
	close(): void;

	/** The transport failed. Always terminal. */
	error(error: unknown): void;
};

/**
 * Abstraction over anything that can carry framed bytes.
 *
 * Must not assume a `Duplex`. HTTP/3 runs over QUIC streams, DNS runs over UDP
 * datagrams, and DNS-over-HTTPS runs over the body of another session — none of
 * which are sockets, and all of which reuse the same codecs and correlation
 * logic.
 *
 * Kept as a bespoke contract rather than a bare `ReadableStream`/
 * `WritableStream` pair. Collapsing to Web Streams costs ~112 ns per received
 * chunk (negligible) but forces either a per-value concatenation (16-233x
 * slower, measured) or the loss of `writev` batching (3.9x more syscalls,
 * measured) on the send side — and a codec is a symmetric pair that should not
 * need two plumbing vocabularies to follow one round trip.
 */
export interface Transport {
	/** Whether bytes arrive as a stream or as discrete messages. */
	readonly mode: TransportMode;

	/**
	 * Begin delivering data to `handlers`.
	 *
	 * Called once by the `FrameLink` that owns this transport.
	 *
	 * @param handlers Callbacks to receive data and lifecycle notifications.
	 */
	start(handlers: TransportHandlers): void;

	/**
	 * Detach the installed handlers without closing the transport.
	 *
	 * Used when handing an already-connected transport to another consumer, as in
	 * an HTTP `Upgrade`. Contrast with {@link destroy}, which tears the transport
	 * down.
	 */
	stop(): void;

	/**
	 * Write buffers as a single logical unit and resolve once accepted.
	 *
	 * Fragments are written in order and, where the transport supports it,
	 * coalesced into one vectored write. In message mode the buffers form exactly
	 * one outbound message.
	 *
	 * @param buffers Ordered payload fragments.
	 * @param signal Cancels the wait for capacity. Note that bytes already handed
	 *   to the transport cannot be unsent; aborting rejects the caller but does
	 *   not retract the write.
	 * @returns Resolves once the transport has accepted the bytes and any
	 *   backpressure has cleared.
	 */
	write(buffers: readonly Uint8Array[], signal?: AbortSignal): Promise<void>;

	/** Stop delivering {@link TransportHandlers["data"]} until {@link resume}. */
	pause(): void;

	/** Resume delivery suspended by {@link pause}. */
	resume(): void;

	/**
	 * Half-close the outbound direction and resolve once flushed.
	 *
	 * @returns Resolves when all pending writes have been sent.
	 */
	end(): Promise<void>;

	/**
	 * Tear the transport down immediately, discarding pending I/O.
	 *
	 * @param error Optional cause, propagated to {@link TransportHandlers.error}
	 *   where the transport supports it.
	 */
	destroy(error?: unknown): void;
}
