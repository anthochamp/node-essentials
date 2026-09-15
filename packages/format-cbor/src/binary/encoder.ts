import {
	concatBytes,
	encodeTextUtf8,
	MASK_64N,
	setBigUint64Be,
	setFloat64Be,
	setUint32Be,
} from "@ac-kit/core";
import type { Encoder } from "@ac-kit/format-core";

import type { DataValue } from "../ast.js";
import { CborError } from "../errors.js";

/**
 * A {@link DataValue} that cannot be represented by this encoder's supported
 * subset.
 */
export class CborEncodeError extends CborError {
	constructor(message: string) {
		super(message);
		this.name = "CborEncodeError";
	}
}

const MAX_ARGUMENT = MASK_64N;

/**
 * Encodes a CBOR head (initial byte + argument), always using the shortest form
 * for `argument` (RFC 8949 §4.1 preferred serialization).
 */
function encodeHead(
	chunks: Uint8Array[],
	majorType: number,
	argument: bigint,
): void {
	if (argument < 0n || argument > MAX_ARGUMENT) {
		throw new CborEncodeError(
			`Argument ${argument} is outside CBOR's representable range (0..2^64-1)`,
		);
	}

	const prefix = majorType << 5;

	if (argument < 24n) {
		chunks.push(Uint8Array.of(prefix | Number(argument)));
	} else if (argument < 256n) {
		chunks.push(Uint8Array.of(prefix | 24, Number(argument)));
	} else if (argument < 65536n) {
		const bytes = new Uint8Array(3);
		bytes[0] = prefix | 25;
		const value = Number(argument);
		bytes[1] = (value >>> 8) & 0xff;
		bytes[2] = value & 0xff;
		chunks.push(bytes);
	} else if (argument < 4294967296n) {
		const bytes = new Uint8Array(5);
		bytes[0] = prefix | 26;
		setUint32Be(bytes, 1, Number(argument));
		chunks.push(bytes);
	} else {
		const bytes = new Uint8Array(9);
		bytes[0] = prefix | 27;
		setBigUint64Be(bytes, 1, argument);
		chunks.push(bytes);
	}
}

function encodeItem(chunks: Uint8Array[], value: DataValue): void {
	switch (value.kind) {
		case "int": {
			if (value.value >= 0n) {
				encodeHead(chunks, 0, value.value);
			} else {
				encodeHead(chunks, 1, -1n - value.value);
			}
			return;
		}
		case "float": {
			const bytes = new Uint8Array(9);
			bytes[0] = (7 << 5) | 27;
			setFloat64Be(bytes, 1, value.value);
			chunks.push(bytes);
			return;
		}
		case "bytes": {
			encodeHead(chunks, 2, BigInt(value.value.length));
			chunks.push(value.value);
			return;
		}
		case "text": {
			const encoded = encodeTextUtf8(value.value);
			encodeHead(chunks, 3, BigInt(encoded.length));
			chunks.push(encoded);
			return;
		}
		case "array": {
			encodeHead(chunks, 4, BigInt(value.items.length));
			for (const item of value.items) encodeItem(chunks, item);
			return;
		}
		case "map": {
			encodeHead(chunks, 5, BigInt(value.entries.length));
			for (const [key, entryValue] of value.entries) {
				encodeItem(chunks, key);
				encodeItem(chunks, entryValue);
			}
			return;
		}
		case "tag": {
			encodeHead(chunks, 6, value.tag);
			encodeItem(chunks, value.value);
			return;
		}
		case "bool":
			chunks.push(Uint8Array.of((7 << 5) | (value.value ? 21 : 20)));
			return;
		case "null":
			chunks.push(Uint8Array.of((7 << 5) | 22));
			return;
		case "undefined":
			chunks.push(Uint8Array.of((7 << 5) | 23));
			return;
		case "simple": {
			if (
				value.value < 0 ||
				value.value > 255 ||
				(value.value >= 20 && value.value <= 23)
			) {
				throw new CborEncodeError(
					`Simple value ${value.value} is out of range or reserved for a named value (false/true/null/undefined)`,
				);
			}
			if (value.value < 24) {
				chunks.push(Uint8Array.of((7 << 5) | value.value));
			} else {
				chunks.push(Uint8Array.of((7 << 5) | 24, value.value));
			}
			return;
		}
	}
}

/**
 * Encodes a {@link DataValue} to CBOR bytes.
 *
 * Always uses definite-length encoding and always encodes `float` as
 * double-precision (major type 7, additional information 27) — both valid per
 * RFC 8949 but not necessarily the shortest possible encoding (§4.1's
 * "preferred serialization" is not fully implemented; only argument widths are
 * minimized). Integers outside `-2^64..2^64-1` and simple values 20-23 throw
 * {@link CborEncodeError} rather than silently promoting to a bignum tag —
 * construct a `{kind: "tag", tag: 2n | 3n, value: {kind: "bytes", ...}}` node
 * directly if a bignum is needed.
 */
export function encodeCbor(value: DataValue): Uint8Array {
	return concatBytes(encodeCborParts(value));
}

/**
 * Encodes a {@link DataValue} to the chunks it is built from, without the final
 * concatenation.
 *
 * Every nested item already appends its own chunk, so a caller writing to a
 * vectored sink can hand these straight over instead of paying a copy to join
 * them and another to split them again.
 */
export function encodeCborParts(value: DataValue): Uint8Array[] {
	const chunks: Uint8Array[] = [];
	encodeItem(chunks, value);
	return chunks;
}

/**
 * The {@link encodeCbor} grammar behind `@ac-kit/format-core`'s `Encoder`
 * contract, for driving an `EncodeStream` or pairing with
 * {@link CborItemDecoder} as a `Codec`.
 *
 * Returns the item vectored, which is what the contract's `View | readonly
 * View[]` return exists for.
 */
export function createCborItemEncoder(): Encoder<DataValue> {
	return { encode: encodeCborParts };
}
