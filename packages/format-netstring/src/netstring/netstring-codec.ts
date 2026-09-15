import type { Codec } from "@ac-kit/format-core";

import {
	createNetstringDecoder,
	type NetstringDecoderOptions,
} from "./netstring-decoder.js";
import { createNetstringEncoder } from "./netstring-encoder.js";

export type NetstringCodecOptions = NetstringDecoderOptions;

/**
 * Creates the netstring codec: `length:payload,`.
 *
 * Use {@link createNetstringDecoder} or {@link createNetstringEncoder} directly
 * where only one direction is needed; a `FrameLink` needs both.
 *
 * Spec: https://cr.yp.to/proto/netstrings.txt
 */
export function createNetstringCodec(
	options?: NetstringCodecOptions,
): Codec<Uint8Array, Uint8Array | string> {
	const decoder = createNetstringDecoder(options);
	const encoder = createNetstringEncoder();

	return {
		decode: (view, context) => decoder.decode(view, context),
		encode: (value) => encoder.encode(value),
	};
}
