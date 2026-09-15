import { PendingExchange } from "./pending-exchange.js";

/**
 * What happens to an exchange whose signal fires.
 *
 * Aborting cannot unsend a request, so the peer will still answer. The policy
 * decides what to do with that orphaned answer.
 *
 * - `discard` — reject the caller and leave a tombstone that silently consumes
 *   the orphaned response. The exchange's own `accept` still identifies where
 *   the response ends, so the connection stays perfectly synchronised. This is
 *   the default because it is the only option that makes an abort behave the
 *   way callers expect: this request fails, everything else keeps working.
 * - `close` — reject the caller and tear the connection down. Appropriate when a
 *   late response must never be acted upon, or when the response length cannot
 *   be determined.
 * - `emit` — reject the caller and surface the late response as an unsolicited
 *   frame.
 */
export type AbortPolicy = "discard" | "close" | "emit";

/** Options accepted by every request-issuing session method. */
export type ExchangeOptions<In, Key = unknown> = {
	/**
	 * Correlation key the peer will echo in its response.
	 *
	 * Required when the session uses a {@link KeyedRegistry} and ignored
	 * otherwise, since order-based registries derive correlation from position.
	 */
	key?: Key;

	/**
	 * Abandons the exchange when it fires. Combine with
	 * {@link ExchangeOptions.abortPolicy} to control what happens to the response
	 * that is already in flight.
	 */
	signal?: AbortSignal;

	/**
	 * Abandons the exchange after this many milliseconds. A convenience over
	 * building an `AbortSignal.timeout`, and the reason `signal` exists for most
	 * callers.
	 */
	timeoutMs?: number;

	/** Defaults to `discard`. */
	abortPolicy?: AbortPolicy;

	/**
	 * Receives the streamed payload of a response frame, if the codec declared
	 * one.
	 *
	 * Delivered as soon as the frame is decoded rather than when the exchange
	 * completes, so a consumer can start draining an HTTP response body while its
	 * trailers are still arriving.
	 */
	onBody?: (frame: In, body: ReadableStream<Uint8Array>) => void;
};

/**
 * Matches inbound frames against outstanding requests.
 *
 * This is the seam that decides what correlation strategies a protocol can
 * express. Hard-coding "always the oldest request" — as a naive implementation
 * does — silently rules out every protocol that answers out of order, so the
 * strategy is pluggable from the start.
 */
export interface ExchangeRegistry<In, Key = unknown> {
	/** Number of exchanges currently outstanding, including tombstones. */
	readonly size: number;

	/**
	 * Add an exchange to the set of candidates for inbound frames.
	 *
	 * @param exchange The exchange to track.
	 * @param key Correlation key, for registries that match on one. Order-based
	 *   registries ignore it.
	 */
	register(exchange: PendingExchange<In>, key?: Key): void;

	/**
	 * Offer an inbound frame to the outstanding exchanges.
	 *
	 * @param frame The decoded frame.
	 * @param body Streamed payload declared by the codec, if any.
	 * @returns `true` if an exchange claimed the frame, `false` if it should be
	 *   treated as unsolicited.
	 */
	offer(frame: In, body?: ReadableStream<Uint8Array>): boolean;

	/**
	 * Stop tracking an exchange without completing it.
	 *
	 * @param exchange The exchange to drop.
	 */
	remove(exchange: PendingExchange<In>): void;

	/**
	 * Fail every outstanding exchange, for example when the connection drops.
	 *
	 * @param error The reason to reject with.
	 */
	rejectAll(error: unknown): void;
}
