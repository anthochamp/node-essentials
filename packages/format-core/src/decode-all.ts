import { ByteAccumulator } from "@ac-kit/core";

import type { DecodeBuffer } from "./decode-buffer.js";
import { DecodeDriver } from "./decode-driver.js";
import type { DecodeSink } from "./decode-sink.js";
import type { Decoder } from "./decoder.js";

/** One decoded value from {@link decodeAll}, with its warnings if any. */
export interface DecodedItem<T, W = never> {
	readonly value: T;
	readonly warnings?: readonly W[];
}

/** Outcome of {@link decodeAll}. */
export interface DecodeAllResult<T, Chunk = Uint8Array, W = never> {
	/** Every value decoded, in order. */
	readonly items: readonly DecodedItem<T, W>[];

	/** Recoverable violations encountered, in order. Decoding continued past each. */
	readonly errors: readonly unknown[];

	/** Set when the decoder reported an unrecoverable violation. */
	readonly fatal?: unknown;

	/**
	 * `true` when the input ended before the decoder could reach a verdict on the
	 * last value — a truncated `input`. No `E` is available for this case (see
	 * {@link DecodeSink["onTruncated"]}); use {@link leftover} for diagnostics.
	 */
	readonly truncated: boolean;

	/** Units never consumed. Non-empty whenever `fatal` or `truncated` is set. */
	readonly leftover: Chunk;
}

/** Options for {@link decodeAll}. */
export interface DecodeAllOptions<View, Chunk = View> {
	/**
	 * Holds and windows the input. Supplied rather than constructed here because
	 * the buffer is what pins the view type — `ByteAccumulator` for a byte
	 * decoder, {@link TextBuffer} for a text one.
	 *
	 * Defaults to a `ByteAccumulator` sized to the input, which is correct only
	 * for a `Uint8Array` decoder.
	 */
	readonly buffer?: DecodeBuffer<View, Chunk>;
}

/**
 * Decode every value a repeatable-item format contains in one complete input —
 * a CBOR sequence (RFC 8742), concatenated netstrings, the rows of a CSV
 * document, or any other back-to-back sequence of values.
 *
 * This is the synchronous face of a {@link Decoder}: a package's `parse*`
 * utility is built on this rather than reimplementing the grammar. Built on
 * {@link DecodeDriver}, so a recoverable `error` is collected and decoding
 * continues instead of aborting on the first bad item.
 */
export function decodeAll<T, W = never>(
	decoder: Decoder<T, Uint8Array, W>,
	input: Uint8Array,
	options?: DecodeAllOptions<Uint8Array>,
): DecodeAllResult<T, Uint8Array, W>;
export function decodeAll<T, View, Chunk, W = never>(
	decoder: Decoder<T, View, W>,
	input: Chunk,
	options: Required<DecodeAllOptions<View, Chunk>>,
): DecodeAllResult<T, Chunk, W>;
export function decodeAll<T, View, Chunk, W = never>(
	decoder: Decoder<T, View, W>,
	input: Chunk,
	options?: DecodeAllOptions<View, Chunk>,
): DecodeAllResult<T, Chunk, W> {
	const items: DecodedItem<T, W>[] = [];
	const errors: unknown[] = [];
	let fatal: unknown;
	let hasFatal = false;
	let truncated = false;

	// The overloads above admit an omitted buffer only when `Chunk` is
	// `Uint8Array`, which is exactly when this default is well typed.
	const buffer =
		options?.buffer ??
		(new ByteAccumulator(
			Math.max((input as Uint8Array).length, 1),
		) as unknown as DecodeBuffer<View, Chunk>);

	const sink: DecodeSink<T, W> = {
		onDecoded(value, _consumed, extra) {
			items.push(
				extra.warnings ? { value, warnings: extra.warnings } : { value },
			);
		},
		onError(error) {
			errors.push(error);
		},
		onFatal(error) {
			fatal = error;
			hasFatal = true;
		},
		onIncomplete() {
			// `close()` runs immediately after `write()` below and forces a
			// verdict; nothing to do while waiting for input that never arrives.
		},
		onPending() {
			// Unreachable: `idle: {kind: "exhausted"}` never re-arms a timer, it
			// resolves `pending` synchronously inside the same `write`/`close` call.
		},
		onTruncated() {
			truncated = true;
		},
	};

	const driver = new DecodeDriver<T, View, Chunk, W>({
		decoder,
		buffer,
		sink,
		idle: { kind: "exhausted" },
	});

	driver.write(input);
	driver.close();

	return {
		items,
		errors,
		...(hasFatal ? { fatal } : {}),
		truncated,
		leftover: buffer.take(),
	};
}
