import { concatBytes, encodeTextUtf8 } from "@ac-kit/core";
import { EncodeStream, type Encoder } from "@ac-kit/format-core";

const COMMA_BYTES_ = encodeTextUtf8(",");

/**
 * Frames one payload as `length:payload,`, vectored so the payload itself is
 * never copied — the length header and the terminator are the only
 * allocations.
 *
 * The single implementation of the netstring write grammar.
 */
function encodeParts(data: Uint8Array | string): readonly Uint8Array[] {
	const payload = typeof data === "string" ? encodeTextUtf8(data) : data;
	return [encodeTextUtf8(`${payload.length}:`), payload, COMMA_BYTES_];
}

/**
 * Creates the netstring write half: payload in, `length:payload,` out.
 *
 * Spec: https://cr.yp.to/proto/netstrings.txt
 */
export function createNetstringEncoder(): Encoder<Uint8Array | string> {
	return { encode: encodeParts };
}

/**
 * Encodes a single netstring frame (`length:payload,`) into one contiguous
 * buffer. Strings are treated as UTF-8.
 *
 * A utility over the same framing the encoder emits, not a second
 * implementation: it only concatenates the vectored parts.
 */
export function encodeNetstring(data: Uint8Array | string): Uint8Array {
	return concatBytes(...encodeParts(data));
}

/**
 * Encodes `Uint8Array` or string payloads as netstring frames
 * (`length:payload,`). Strings are treated as UTF-8.
 *
 * Spec: https://cr.yp.to/proto/netstrings.txt
 */
export class NetstringEncodeStream extends EncodeStream<Uint8Array | string> {
	constructor() {
		super(createNetstringEncoder());
	}
}
