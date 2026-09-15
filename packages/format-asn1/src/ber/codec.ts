import { ByteReader } from "@ac-kit/core";
import {
	type DecodeContext,
	type Decoder,
	type DecodeResult,
	type Encoder,
	decodeIncomplete,
} from "@ac-kit/format-core";

import { readTlvHeader } from "../_encoding/tlv.js";
import type { DefInputOf, DefValueOf } from "../schema/def.js";
import type { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import { type BerDecodeOptions, berDecode } from "./decode.js";
import { type BerEncodeOptions, berEncode } from "./encode.js";

/**
 * Total byte length of the TLV at the front of `view`, or `undefined` when the
 * header itself has not fully arrived.
 *
 * Indefinite-length encodings are reported as `undefined` too: their extent is
 * only known once the matching end-of-contents marker is found, which is a scan
 * the framing layer must not do speculatively.
 */
function framedLength(view: Uint8Array): number | undefined {
	try {
		const header = readTlvHeader(new ByteReader(view));
		if (header.length === undefined) {
			return undefined;
		}
		return header.valueOffset + header.length;
	} catch {
		return undefined;
	}
}

/**
 * Creates a BER {@link Decoder} bound to `def`.
 *
 * ASN.1 is schema-driven, so the definition is fixed at construction rather
 * than passed per call — there is no such thing as a schema-free `Decoder<T>`
 * for this format.
 *
 * Framing comes from the TLV header: the declared length says exactly how many
 * bytes one value occupies, so an incomplete value is reported as such with a
 * `needAtLeast` hint instead of being guessed at. Indefinite-length encodings
 * are decoded only once the whole input is available, since their extent is not
 * declared up front.
 *
 * A malformed value is `fatal`: the length that framed it cannot be trusted, so
 * there is no position to resynchronise from.
 */
export function createBerDecoder<D extends AnyAsn1TypeDef>(
	def: D,
	options: BerDecodeOptions = {},
): Decoder<DefValueOf<D>> {
	return {
		decode(
			view: Uint8Array,
			context: DecodeContext,
		): DecodeResult<DefValueOf<D>> {
			const total = framedLength(view);

			if (total === undefined) {
				if (!context.atEof) {
					return { status: "incomplete" };
				}
				// At end of input the buffer is all there will ever be, so an
				// indefinite-length value can finally be decoded against it.
				return decodeSlice(def, view, view.length, options);
			}

			if (view.length < total) {
				return decodeIncomplete(total);
			}
			return decodeSlice(def, view.subarray(0, total), total, options);
		},
	};
}

function decodeSlice<D extends AnyAsn1TypeDef>(
	def: D,
	slice: Uint8Array,
	consumed: number,
	options: BerDecodeOptions,
): DecodeResult<DefValueOf<D>> {
	try {
		return {
			status: "decoded",
			value: berDecode(def, slice, options),
			consumed,
		};
	} catch (error) {
		return {
			status: "fatal",
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Creates a BER {@link Encoder} bound to `def`, the write half matching
 * {@link createBerDecoder}.
 */
export function createBerEncoder<D extends AnyAsn1TypeDef>(
	def: D,
	options: BerEncodeOptions = {},
): Encoder<DefInputOf<D>> {
	return {
		encode: (value) => berEncode(def, value, options),
	};
}
