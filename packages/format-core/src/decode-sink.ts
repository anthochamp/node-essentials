import type { BodySpec } from "./body-spec.js";

/**
 * Callbacks a {@link DecodeDriver} invokes per {@link DecodeResult} variant.
 *
 * A plain callbacks object rather than an event map — mirrors `net/core`'s
 * `TransportHandlers`: the driver has exactly one consumer and this is a hot
 * path, so dispatcher machinery is not worth its per-value cost here.
 */
export interface DecodeSink<T, W = never> {
	/** One value decoded. `body`, when present, must be drained by the caller. */
	onDecoded(
		value: T,
		consumed: number,
		extra: { body?: BodySpec; warnings?: readonly W[] },
	): void;

	/** A recoverable violation. `consumed` units were dropped; decoding continues. */
	onError(error: unknown, consumed: number): void;

	/** An unrecoverable violation. The driver is no longer usable. */
	onFatal(error: unknown): void;

	/** More input is needed before the next decode attempt can succeed. */
	onIncomplete(needAtLeast: number | undefined): void;

	/** Input is present but only silence delimits the value. */
	onPending(frameTimeout: number): void;

	/**
	 * No more input will ever arrive and the decoder still could not reach a
	 * verdict (an `incomplete` that never resolved, or a `pending` that stayed
	 * `pending` after one final attempt with `timedOut` forced).
	 *
	 * Deliberately carries no error: the driver has no way to construct an
	 * `E`-typed value for an arbitrary decoder-owned error type. The caller knows
	 * how to report "truncated" in its own vocabulary — `FrameLink` reports it
	 * the same way it reports a transport failure, `decodeAll` surfaces it as a
	 * `truncated` flag alongside whatever `leftover` bytes remain.
	 */
	onTruncated(needAtLeast: number | undefined): void;
}
