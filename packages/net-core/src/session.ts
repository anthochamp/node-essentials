import { EventDispatcherMapBase } from "@ac-kit/async";
import type { Codec } from "@ac-kit/format-core";

import {
	type ExchangeOptions,
	type ExchangeRegistry,
} from "./exchange-registry.js";
import { FrameLink } from "./frame-link.js";
import { ExchangeAccept, PendingExchange } from "./pending-exchange.js";
import { ScanningRegistry } from "./scanning-registry.js";
import type { Transport } from "./transport.js";

/** Events every session emits, regardless of protocol. */
export type BaseSessionEvents = {
	/** A recoverable protocol violation. Outstanding exchanges are unaffected. */
	protocolError: [error: unknown];

	/** A fatal error. Outstanding exchanges have already been rejected. */
	error: [error: unknown];

	/** The peer half-closed. */
	end: [];

	/** The connection is fully closed. */
	close: [];
};

/** Construction options for {@link Session}. */
export type SessionOptions<In, Out, Key = unknown> = {
	/** Carrier for the framed bytes. */
	transport: Transport;

	/** Decoder and encoder for this protocol. */
	codec: Codec<In, Out>;

	/**
	 * Hard ceiling, in bytes, on undecoded received data. Required; see
	 * {@link FrameLinkOptions.maxBufferSize}.
	 */
	maxBufferSize: number;

	/** Initial receive arena size. Defaults to 8 KiB. */
	initialCapacity?: number;

	/**
	 * Correlation strategy for inbound frames. Defaults to strict FIFO, which
	 * suits ordered text protocols; supply a {@link KeyedRegistry} for protocols
	 * that answer out of order, or a wider {@link ScanningRegistry} for
	 * uncorrelated ones.
	 */
	registry?: ExchangeRegistry<In, Key>;
};

/**
 * Peer-symmetric protocol session.
 *
 * Owns a {@link FrameLink}, an {@link ExchangeRegistry} for requests this side
 * has issued, and the lifecycle that ties them together. There is no
 * client/server type split: many protocols — RTMP, AMQP, MQTT, WebSocket, IRC —
 * have both peers issuing and answering requests, so a client is simply a
 * session that registers no inbound handlers and a server one that never issues
 * requests.
 *
 * Subclasses implement {@link routeFrame} to decide, per frame, whether it
 * belongs to an outstanding exchange, is an unsolicited server message, or
 * both.
 *
 * @typeParam In - Inbound frame type.
 * @typeParam Out - Outbound frame type.
 * @typeParam Events - Protocol-specific event map, extending
 *   {@link BaseSessionEvents}.
 */
export abstract class Session<
	In,
	Out,
	Events extends BaseSessionEvents,
	Key = unknown,
> extends EventDispatcherMapBase<Events> {
	private readonly link: FrameLink<In, Out>;
	private readonly registry: ExchangeRegistry<In, Key>;

	protected constructor(options: SessionOptions<In, Out, Key>) {
		super();
		this.registry = options.registry ?? new ScanningRegistry<In>();
		this.link = new FrameLink<In, Out>({
			transport: options.transport,
			codec: options.codec,
			maxBufferSize: options.maxBufferSize,
			initialCapacity: options.initialCapacity,
			sink: (frame, body) => this.routeFrame(frame, body),
		});

		this.link.subscribe("protocolError", (error) => {
			this.dispatchBase("protocolError", error);
		});
		this.link.subscribe("error", (error) => {
			this.registry.rejectAll(error);
			this.dispatchBase("error", error);
		});
		this.link.subscribe("end", () => {
			this.dispatchBase("end");
		});
		this.link.subscribe("close", () => {
			this.registry.rejectAll(new Error("Connection closed"));
			this.dispatchBase("close");
		});
	}

	/**
	 * Route one decoded frame.
	 *
	 * Called for every inbound frame in arrival order. A typical implementation
	 * calls {@link offer} and, when that returns `false`, dispatches the frame as
	 * an unsolicited protocol event.
	 *
	 * @param frame The decoded frame.
	 * @param body Streamed payload declared by the codec, if any.
	 */
	protected abstract routeFrame(
		frame: In,
		body?: ReadableStream<Uint8Array>,
	): void;

	/**
	 * Offer a frame to the outstanding exchanges.
	 *
	 * @param frame The decoded frame.
	 * @param body Streamed payload declared by the codec, if any.
	 * @returns `true` if an exchange claimed it.
	 */
	protected offer(frame: In, body?: ReadableStream<Uint8Array>): boolean {
		return this.registry.offer(frame, body);
	}

	/**
	 * Send a frame and collect the response frames it elicits.
	 *
	 * The exchange is registered before the write is issued, so a response cannot
	 * arrive in the window between sending and waiting.
	 *
	 * @param frame The request frame.
	 * @param accept Classifies inbound frames as part of this exchange.
	 * @param options Abort, timeout, abort policy and body delivery.
	 * @returns The frames the exchange accepted, in arrival order.
	 */
	protected async request(
		frame: Out,
		accept: ExchangeAccept<In>,
		options?: ExchangeOptions<In, Key>,
	): Promise<In[]> {
		const { exchange, promise } = this.createExchange(accept, options);
		try {
			await this.link.send(frame, options?.signal);
		} catch (error) {
			this.registry.remove(exchange);
			exchange.fail(error as Error);
		}
		return promise;
	}

	/**
	 * Register an exchange without sending anything.
	 *
	 * Needed when the request and its response are separated by raw traffic, as
	 * in an SMTP `DATA` body or an LMTP per-recipient response burst.
	 *
	 * @param accept Classifies inbound frames as part of this exchange.
	 * @param options Abort, timeout, abort policy and body delivery.
	 * @returns The frames the exchange accepted, in arrival order.
	 */
	protected collect(
		accept: ExchangeAccept<In>,
		options?: ExchangeOptions<In, Key>,
	): Promise<In[]> {
		return this.createExchange(accept, options).promise;
	}

	/**
	 * Encode and send one frame without awaiting a response.
	 *
	 * @param frame The frame to transmit.
	 * @param signal Cancels the wait for transport capacity.
	 */
	protected send(frame: Out, signal?: AbortSignal): Promise<void> {
		return this.link.send(frame, signal);
	}

	/**
	 * Send raw bytes, bypassing the encoder.
	 *
	 * @param data One or more buffers, written as a single vectored write.
	 * @param signal Cancels the wait for transport capacity.
	 */
	protected sendRaw(
		data: Uint8Array | readonly Uint8Array[],
		signal?: AbortSignal,
	): Promise<void> {
		return this.link.sendRaw(data, signal);
	}

	/** Discard undecoded bytes and decoder state. */
	protected reset(): void {
		this.link.reset();
	}

	/**
	 * Replace the transport, for example after negotiating TLS.
	 *
	 * @param transport The transport to use from now on.
	 * @param options `keepResidue` retains undecoded bytes; leave it unset for
	 *   STARTTLS, where buffered plaintext must be rejected.
	 */
	protected swapTransport(
		transport: Transport,
		options?: { keepResidue?: boolean },
	): void {
		this.link.swapTransport(transport, options);
	}

	/**
	 * Take the undecoded bytes, for handing to another protocol after an upgrade.
	 *
	 * @returns A copy of the bytes received but not yet decoded.
	 */
	protected takeResidue(): Uint8Array {
		return this.link.takeResidue();
	}

	/** Bytes received but not yet decoded. */
	get buffered(): number {
		return this.link.buffered;
	}

	/** Number of outstanding exchanges, including abort tombstones. */
	get pendingExchanges(): number {
		return this.registry.size;
	}

	/**
	 * Half-close the outbound direction and flush pending writes.
	 *
	 * Prefer this over {@link destroy} for protocols with a farewell command, so
	 * the peer sees an orderly shutdown.
	 */
	end(): Promise<void> {
		return this.link.end();
	}

	/**
	 * Tear the session down, rejecting every outstanding exchange.
	 *
	 * Rejection happens here rather than relying on the transport emitting
	 * `close`, so callers are never left with promises that hang against a
	 * transport that closes silently.
	 *
	 * @param error Optional cause reported to outstanding exchanges.
	 */
	destroy(error?: unknown): void {
		this.registry.rejectAll(error ?? new Error("Session destroyed"));
		this.link.destroy(error);
	}

	/** Destroys the session, so it can be used with `await using`. */
	async [Symbol.asyncDispose](): Promise<void> {
		this.destroy();
	}

	/**
	 * Builds an exchange and wires abort, timeout and abort-policy handling.
	 *
	 * Centralised so the three call sites cannot drift apart, which is where
	 * subtle abort bugs breed.
	 */
	private createExchange(
		accept: ExchangeAccept<In>,
		options?: ExchangeOptions<In, Key>,
	): { exchange: PendingExchange<In>; promise: Promise<In[]> } {
		const signal = this.combineSignals(options);
		signal?.throwIfAborted();

		const { promise, resolve, reject } = Promise.withResolvers<In[]>();
		const exchange = new PendingExchange<In>(
			accept,
			resolve,
			reject,
			options?.onBody,
		);

		if (signal) {
			const onAbort = () => {
				const policy = options?.abortPolicy ?? "discard";
				const error = new Error("Exchange aborted", {
					cause: signal.reason,
				});

				if (policy === "discard") {
					// Keep the exchange registered so the response still in flight is
					// absorbed and the frame stream stays synchronised.
					exchange.orphaned = true;
					reject(error);
					return;
				}

				this.registry.remove(exchange);
				exchange.fail(error);
				if (policy === "close") {
					this.destroy(error);
				}
			};
			signal.addEventListener("abort", onAbort, { once: true });
		}

		this.registry.register(exchange, options?.key);
		return { exchange, promise };
	}

	private combineSignals(
		options?: ExchangeOptions<In, Key>,
	): AbortSignal | undefined {
		if (options?.timeoutMs === undefined) {
			return options?.signal;
		}
		const timeout = AbortSignal.timeout(options.timeoutMs);
		return options.signal
			? AbortSignal.any([options.signal, timeout])
			: timeout;
	}

	/** Narrow dispatch helper for the events declared on the base map. */
	private dispatchBase<K extends keyof BaseSessionEvents>(
		event: K,
		...args: BaseSessionEvents[K]
	): void {
		(this.dispatch as (event: K, ...args: BaseSessionEvents[K]) => void)(
			event,
			...args,
		);
	}
}
