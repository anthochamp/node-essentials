import {
	ByteAccumulator,
	BYTES_PER_MIB,
	COLON,
	COMMA,
	DIGIT_ZERO,
	isAsciiDigit,
} from "@ac-kit/core";
import {
	DECODE_INCOMPLETE,
	decodeIncomplete,
	DecodeStream,
	type Decoder,
	type DecodeResult,
} from "@ac-kit/format-core";

import { NetstringProtocolError } from "./netstring-error.js";

const DEFAULT_MAX_PAYLOAD_LENGTH_ = BYTES_PER_MIB;
const DEFAULT_MAX_BUFFER_SIZE_ = BYTES_PER_MIB;

/** Construction options for the netstring decoding half. */
export interface NetstringDecoderOptions {
	/**
	 * Maximum declared payload length, in bytes.
	 *
	 * A netstring announces its own length before sending any of it, so this
	 * limit is checked against the declaration rather than against bytes
	 * received. That lets a hostile `999999999999:` be rejected immediately
	 * instead of after the receive buffer fills.
	 *
	 * Defaults to 1 MiB.
	 */
	maxPayloadLength?: number;
}

/**
 * Creates the netstring read half: `length:payload,` in, payload bytes out.
 *
 * Length-field violations are reported as recoverable errors — the decoder
 * knows exactly how many bytes to discard, so framing resynchronises — while a
 * missing terminator is fatal, because at that point the declared length cannot
 * be trusted and frame synchronisation is lost.
 *
 * The single implementation of the netstring read grammar; every other read
 * face in this package is driven by it.
 *
 * Spec: https://cr.yp.to/proto/netstrings.txt
 */
export function createNetstringDecoder(
	options?: NetstringDecoderOptions,
): Decoder<Uint8Array, Uint8Array> {
	const maxPayloadLength =
		options?.maxPayloadLength ?? DEFAULT_MAX_PAYLOAD_LENGTH_;

	return {
		decode(view: Uint8Array): DecodeResult<Uint8Array> {
			// One pass validates the digits and accumulates the length. Parsing the
			// field as a string would allocate once per frame for no benefit, and
			// checking the ceiling as we go rejects an absurd declaration before the
			// value can overflow.
			let length = 0;
			let colon = -1;
			for (let index = 0; index < view.length; index++) {
				const byte = view[index]!;
				if (byte === COLON) {
					colon = index;
					break;
				}
				if (!isAsciiDigit(byte)) {
					return {
						status: "error",
						error: new NetstringProtocolError(
							`Unexpected byte 0x${byte.toString(16).padStart(2, "0")} in netstring length field`,
						),
						consumed: index + 1,
					};
				}
				length = length * 10 + (byte - DIGIT_ZERO);
				if (length > maxPayloadLength) {
					return {
						status: "fatal",
						error: new NetstringProtocolError(
							`Declared netstring payload exceeds the ${maxPayloadLength} byte limit`,
						),
					};
				}
			}

			if (colon === -1) {
				// Every buffered byte is a digit, so the length field is still arriving.
				return DECODE_INCOMPLETE;
			}

			if (colon === 0) {
				return {
					status: "error",
					error: new NetstringProtocolError("Empty netstring length field"),
					consumed: 1,
				};
			}

			const total = colon + 1 + length + 1;
			if (view.length < total) {
				return decodeIncomplete(total);
			}

			const terminator = view[total - 1];
			if (terminator !== COMMA) {
				return {
					status: "fatal",
					error: new NetstringProtocolError(
						`Expected netstring comma terminator, got 0x${(terminator ?? 0)
							.toString(16)
							.padStart(2, "0")}`,
					),
				};
			}

			// Copy: the view is invalidated as soon as the driver consumes.
			const payload = view.slice(colon + 1, colon + 1 + length);
			return { status: "decoded", value: payload, consumed: total };
		},
	};
}

export type NetstringDecodeStreamOptions = NetstringDecoderOptions & {
	/**
	 * Hard ceiling on undecoded retained bytes. Distinct from
	 * {@link NetstringDecoderOptions.maxPayloadLength}, which bounds one declared
	 * frame; this bounds how much a producer may hand over before any of it is
	 * decodable. Defaults to 1 MiB.
	 */
	maxBufferSize?: number;

	/**
	 * Invoked for a recoverable protocol violation. Decoding continues afterward
	 * — the Streams Standard has no event for a transform stream to report an
	 * error without closing, so this callback is the substitute for the
	 * `'error'`-without-`destroy()` pattern a Node.js `Transform` would use.
	 */
	onProtocolError?: (error: unknown) => void;
};

/**
 * Decodes a byte stream of netstring-framed data into individual payloads.
 *
 * Spec: https://cr.yp.to/proto/netstrings.txt
 */
export class NetstringDecodeStream extends DecodeStream<
	Uint8Array,
	Uint8Array,
	Uint8Array
> {
	constructor(options?: NetstringDecodeStreamOptions) {
		super(createNetstringDecoder(options), {
			buffer: new ByteAccumulator(
				options?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE_,
			),
			...(options?.onProtocolError ? { onError: options.onProtocolError } : {}),
		});
	}
}
