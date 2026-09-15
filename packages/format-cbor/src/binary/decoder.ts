import {
	ByteReader,
	concatBytes,
	decodeText,
	getBigUint64Be,
	getFloat32Be,
	getFloat64Be,
	getUint32Be,
} from "@ac-kit/core";
import type { Decoder, DecodeResult } from "@ac-kit/format-core";
import { Float16 } from "@ac-kit/math-numbers";

import type { DataValue } from "../ast.js";
import { CborDecodeError } from "../errors.js";

const BREAK_BYTE = 0xff;

function readArgument(reader: ByteReader, additionalInfo: number): bigint {
	if (additionalInfo < 24) return BigInt(additionalInfo);
	const byteLength =
		additionalInfo === 24
			? 1
			: additionalInfo === 25
				? 2
				: additionalInfo === 26
					? 4
					: 8;
	if (additionalInfo > 27) {
		throw new CborDecodeError(
			`Reserved additional information value ${additionalInfo}`,
		);
	}
	return getBigUint64Be(reader.read(byteLength), 0, byteLength);
}

function decodeByteString(
	reader: ByteReader,
	additionalInfo: number,
): Uint8Array {
	if (additionalInfo === 31) {
		const chunks: Uint8Array[] = [];
		while (reader.peekByte() !== BREAK_BYTE) {
			const initialByte = reader.readByte();
			const chunkAdditionalInfo = initialByte & 0x1f;
			if (initialByte >>> 5 !== 2 || chunkAdditionalInfo === 31) {
				throw new CborDecodeError(
					"Indefinite-length byte string chunk must be a definite-length byte string",
				);
			}
			chunks.push(
				new Uint8Array(
					reader.read(Number(readArgument(reader, chunkAdditionalInfo))),
				),
			);
		}
		reader.readByte();
		return concatBytes(chunks);
	}
	return new Uint8Array(
		reader.read(Number(readArgument(reader, additionalInfo))),
	);
}

function decodeTextString(reader: ByteReader, additionalInfo: number): string {
	if (additionalInfo === 31) {
		const chunks: Uint8Array[] = [];
		while (reader.peekByte() !== BREAK_BYTE) {
			const initialByte = reader.readByte();
			const chunkAdditionalInfo = initialByte & 0x1f;
			if (initialByte >>> 5 !== 3 || chunkAdditionalInfo === 31) {
				throw new CborDecodeError(
					"Indefinite-length text string chunk must be a definite-length text string",
				);
			}
			chunks.push(
				new Uint8Array(
					reader.read(Number(readArgument(reader, chunkAdditionalInfo))),
				),
			);
		}
		reader.readByte();
		return decodeText(concatBytes(chunks), "utf-8", { fatal: true });
	}
	return decodeText(
		reader.read(Number(readArgument(reader, additionalInfo))),
		"utf-8",
		{ fatal: true },
	);
}

function decodeArray(reader: ByteReader, additionalInfo: number): DataValue {
	const items: DataValue[] = [];
	if (additionalInfo === 31) {
		while (reader.peekByte() !== BREAK_BYTE) items.push(decodeItem(reader));
		reader.readByte();
	} else {
		const length = Number(readArgument(reader, additionalInfo));
		for (let index = 0; index < length; index++) items.push(decodeItem(reader));
	}
	return { kind: "array", items };
}

function decodeMap(reader: ByteReader, additionalInfo: number): DataValue {
	const entries: [DataValue, DataValue][] = [];
	if (additionalInfo === 31) {
		while (reader.peekByte() !== BREAK_BYTE) {
			entries.push([decodeItem(reader), decodeItem(reader)]);
		}
		reader.readByte();
	} else {
		const count = Number(readArgument(reader, additionalInfo));
		for (let index = 0; index < count; index++) {
			entries.push([decodeItem(reader), decodeItem(reader)]);
		}
	}
	return { kind: "map", entries };
}

function decodeSimpleOrFloat(
	reader: ByteReader,
	additionalInfo: number,
): DataValue {
	if (additionalInfo < 20) return { kind: "simple", value: additionalInfo };

	switch (additionalInfo) {
		case 20:
			return { kind: "bool", value: false };
		case 21:
			return { kind: "bool", value: true };
		case 22:
			return { kind: "null" };
		case 23:
			return { kind: "undefined" };
		case 24: {
			const value = reader.readByte();
			if (value < 32) {
				throw new CborDecodeError(
					`Two-byte simple value encoding must encode a value >= 32, got ${value}`,
				);
			}
			return { kind: "simple", value };
		}
		case 25:
			return {
				kind: "float",
				// Raw 16-bit unsigned read (no float reinterpretation needed yet); Float16
				// itself does the half-precision-to-binary64 unpacking.
				value: Float16.fromBits(getUint32Be(reader.read(2), 0, 2)).valueOf(),
			};
		case 26:
			return { kind: "float", value: getFloat32Be(reader.read(4), 0) };
		case 27:
			return { kind: "float", value: getFloat64Be(reader.read(8), 0) };
		default:
			throw new CborDecodeError(
				`Reserved additional information value ${additionalInfo} for major type 7`,
			);
	}
}

function decodeItem(reader: ByteReader): DataValue {
	const initialByte = reader.readByte();
	const majorType = initialByte >>> 5;
	const additionalInfo = initialByte & 0x1f;

	switch (majorType) {
		case 0:
			return { kind: "int", value: readArgument(reader, additionalInfo) };
		case 1:
			return { kind: "int", value: -1n - readArgument(reader, additionalInfo) };
		case 2:
			return { kind: "bytes", value: decodeByteString(reader, additionalInfo) };
		case 3:
			return { kind: "text", value: decodeTextString(reader, additionalInfo) };
		case 4:
			return decodeArray(reader, additionalInfo);
		case 5:
			return decodeMap(reader, additionalInfo);
		case 6: {
			const tag = readArgument(reader, additionalInfo);
			return { kind: "tag", tag, value: decodeItem(reader) };
		}
		default:
			return decodeSimpleOrFloat(reader, additionalInfo);
	}
}

/** Outcome of {@link decodeCborItem}. */
export type CborItemDecodeResult =
	| { readonly status: "incomplete" }
	| {
			readonly status: "item";
			readonly value: DataValue;
			readonly consumed: number;
	  }
	| {
			readonly status: "error";
			readonly error: CborDecodeError;
			/** Bytes the reader had consumed when the item was rejected. */
			readonly consumed: number;
	  };

/**
 * Attempts to decode one top-level CBOR data item starting at `offset`.
 *
 * Modeled on `@ac-kit/format-core`'s incremental `DecodeResult` (this package's
 * answer to whether a "Lexer" should be a streaming class or an eager
 * tokenize-to-array function — CBOR is self-delimiting but an item's total
 * length isn't known until it is fully parsed, which is exactly the shape that
 * needs an incremental result instead of an eager array). Unlike
 * `DecodeResult`, `incomplete` carries no `needAtLeast` — the recursive descent
 * has no cheap way to compute one; a caller retries once more bytes arrive.
 * {@link CborItemDecoder} adapts this to the `Decoder` contract directly, for
 * driving via `decodeAll`/`DecodeStream`.
 */
export function decodeCborItem(
	buffer: Uint8Array,
	offset = 0,
): CborItemDecodeResult {
	const reader = new ByteReader(buffer, offset);
	try {
		const value = decodeItem(reader);
		return { status: "item", value, consumed: reader.position - offset };
	} catch (error) {
		if (error instanceof RangeError) return { status: "incomplete" };
		if (error instanceof CborDecodeError) {
			return {
				status: "error",
				error,
				consumed: reader.position - offset,
			};
		}
		throw error;
	}
}

/**
 * Decodes exactly one CBOR data item from `bytes`; no trailing bytes are
 * allowed.
 */
export function decodeCbor(bytes: Uint8Array): DataValue {
	const result = decodeCborItem(bytes);
	if (result.status === "incomplete") {
		throw new CborDecodeError(
			"Unexpected end of input while decoding a CBOR data item",
		);
	}
	if (result.status === "error") throw result.error;
	if (result.consumed !== bytes.length) {
		throw new CborDecodeError(
			`${bytes.length - result.consumed} trailing byte(s) after a complete CBOR data item`,
		);
	}
	return result.value;
}

/**
 * Adapts {@link decodeCborItem} to `@ac-kit/format-core`'s `Decoder` contract,
 * for decoding a CBOR sequence (RFC 8742) via `decodeAll` (a complete buffer)
 * or `DecodeStream` (chunks arriving over time). Replaces a hand-rolled
 * `CborSequenceDecoder` that reimplemented the same accumulate-and-dispatch
 * loop `DecodeDriver` now provides generically.
 *
 * `error` results are recoverable whenever the reader made progress before
 * rejecting the item: `consumed` bytes are dropped and the next item is tried,
 * which is what lets one bad item in a sequence not end the whole stream. An
 * error at offset zero is reported as `fatal`, since retrying from an unmoved
 * position could not terminate.
 */
export class CborItemDecoder implements Decoder<
	DataValue,
	Uint8Array,
	CborDecodeError
> {
	decode(view: Uint8Array): DecodeResult<DataValue, CborDecodeError> {
		const result = decodeCborItem(view, 0);
		switch (result.status) {
			case "item":
				return {
					status: "decoded",
					value: result.value,
					consumed: result.consumed,
				};
			case "error":
				return result.consumed > 0
					? {
							status: "error",
							error: result.error,
							consumed: result.consumed,
						}
					: { status: "fatal", error: result.error };
			default:
				return { status: "incomplete" };
		}
	}
}
