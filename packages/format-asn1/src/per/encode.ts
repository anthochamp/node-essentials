import {
	BitBuilder,
	encodeTextLatin1,
	encodeTextUtf16Be,
	encodeTextUtf8,
} from "@ac-kit/core";
import { bigIntToBytesBe } from "@ac-kit/math-integer";

import { EncodingError } from "../_encoding/errors.js";
import { encodeOid, encodeReal } from "../_encoding/values.js";
import { DefInputOf } from "../schema/def.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import { Asn1ChoiceTypeDef } from "../schema/types/constructed/choice.js";
import type { Asn1AlternativeDef } from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";
import { resolveInstance } from "../schema/types/parameterized/parameterized-type.js";
import { BitStringValue, RealValue } from "../schema/values.js";
import { bitsNeeded, getSizeConstraint, getValueRange } from "./constraints.js";

export interface PerEncodeOptions {
	/** True = Aligned PER (default), false = Unaligned PER */
	readonly aligned?: boolean;
}

/**
 * PER encoder (X.691).
 *
 * PER encodes only the values; tags and lengths are omitted except where
 * required by the schema structure (unconstrained lengths, CHOICE indices,
 * etc.).
 *
 * Two variants: - ALIGNED (default): values are padded/aligned to byte
 * boundaries after length determinants and certain constrained types. -
 * UNALIGNED: no padding; bits are packed end-to-end.
 */
export function perEncode<D extends AnyAsn1TypeDef>(
	def: D,
	value: DefInputOf<D>,
	opts: PerEncodeOptions = {},
): Uint8Array {
	const w = new BitBuilder();
	perEncodeInto(def, value, w, opts.aligned ?? true);
	return w.result();
}

function perEncodeInto(
	def: AnyAsn1TypeDef,
	value: unknown,
	w: BitBuilder,
	aligned: boolean,
): void {
	if (def.kind === "lazy") {
		perEncodeInto(def.getter(), value, w, aligned);
		return;
	}
	if (def.kind === "transform") {
		perEncodeInto(def.innerType, value, w, aligned);
		return;
	}
	if (def.kind === "parameterizedTypeInstance") {
		perEncodeInto(resolveInstance(def), value, w, aligned);
		return;
	}
	if (def.kind === "tagged") {
		perEncodeInto(def.innerType, value, w, aligned);
		return;
	}

	switch (def.kind) {
		case "boolean":
			w.writeBit((value as boolean) ? 1 : 0);
			return;

		case "integer":
		case "enumerated": {
			const v = value as bigint;
			const range = getValueRange(def);
			if (
				range &&
				typeof range.lb !== "string" &&
				typeof range.ub !== "string"
			) {
				// Constrained whole number (X.691 §12.2)
				const lb = range.lb;
				const ub = range.ub;
				const span = ub - lb;
				const offset = v - lb;
				const bits = bitsNeeded(span);
				if (aligned && bits > 8 && bits <= 16) {
					w.align();
					w.writeBits(Number(offset), 16);
				} else if (aligned && bits > 16 && bits <= 32) {
					w.align();
					w.writeBits(Number(offset), 32);
				} else if (aligned && bits > 32) {
					w.align();
					const bytes = bigIntToBytesBe(offset);
					w.writeByte(bytes.length);
					for (const b of bytes) w.writeByte(b);
				} else {
					w.writeBits(Number(offset), bits);
				}
			} else {
				// Unconstrained: length-prefixed two's complement (X.691 §12.5)
				const bytes = bigIntToBytesBe(v);
				if (aligned) w.align();
				w.writeByte(bytes.length);
				for (const b of bytes) w.writeByte(b);
			}
			return;
		}

		case "bitString": {
			const bs = value as BitStringValue;
			const size = getSizeConstraint(def);
			const bitLen = bs.bytes.length * 8 - bs.unusedBits;
			if (size && size.lb === size.ub) {
				// Fixed size: no length needed
				if (aligned && Number(size.lb) > 16) w.align();
				w.writeBytes(bs.bytes);
			} else {
				// Fragments count bits, and a whole fragment is 16K bits — a byte
				// boundary — so only the final partial one can end mid-octet.
				perEncodeFragmented(bitLen, w, aligned, (start, end) => {
					if (aligned) w.align();
					w.writeBytes(bs.bytes.subarray(start >> 3, Math.ceil(end / 8)));
				});
			}
			return;
		}

		case "octetString": {
			const bytes = value as Uint8Array;
			const size = getSizeConstraint(def);
			if (size && size.lb === size.ub && typeof size.ub !== "string") {
				// Fixed size: no length
				if (aligned && Number(size.lb) > 2) w.align();
				w.writeBytes(bytes);
			} else {
				perEncodeLengthPrefixedBytes(bytes, w, aligned);
			}
			return;
		}

		case "null":
			return; // NULL encodes to zero bits

		case "objectIdentifier": {
			const oidBytes = encodeOid(value as readonly number[]);
			perEncodeLengthPrefixedBytes(oidBytes, w, aligned);
			return;
		}

		case "real": {
			const rv = value as RealValue;
			if (rv.kind !== "finite") {
				const special =
					rv.kind === "plusInfinity"
						? new Uint8Array([0x40])
						: rv.kind === "minusInfinity"
							? new Uint8Array([0x41])
							: new Uint8Array([0x42]);
				perEncodeLengthPrefixedBytes(special, w, aligned);
			} else {
				perEncodeLengthPrefixedBytes(encodeReal(rv), w, aligned);
			}
			return;
		}

		case "utf8String": {
			const bytes = encodeTextUtf8(value as string);
			perEncodeStringTo(bytes, def, w, aligned);
			return;
		}

		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString": {
			const bytes = encodeTextLatin1(value as string);
			perEncodeStringTo(bytes, def, w, aligned);
			return;
		}

		case "bmpString": {
			const bytes = encodeTextUtf16Be(value as string);
			perEncodeStringTo(bytes, def, w, aligned);
			return;
		}

		case "utcTime":
		case "generalizedTime":
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration": {
			const bytes = encodeTextLatin1(value as string);
			perEncodeLengthPrefixedBytes(bytes, w, aligned);
			return;
		}

		case "sequence":
		case "set":
			perEncodeSequence(def, value as Record<string, unknown>, w, aligned);
			return;

		case "sequenceOf":
		case "setOf": {
			const items = value as unknown[];
			const size = getSizeConstraint(def);
			const elementDef = def.elementType;
			if (size && size.lb === size.ub && typeof size.ub !== "string") {
				// Fixed size
				for (const item of items) perEncodeInto(elementDef, item, w, aligned);
			} else {
				perEncodeFragmented(items.length, w, aligned, (start, end) => {
					for (let index = start; index < end; index++) {
						perEncodeInto(elementDef, items[index], w, aligned);
					}
				});
			}
			return;
		}

		case "choice": {
			const cv = value as { kind: string; value: unknown };
			const alts = (def as Asn1ChoiceTypeDef).alternatives.filter(
				(a) =>
					!("kind" in a) ||
					(a.kind !== "extensionMarker" && a.kind !== "extensionAdditionGroup"),
			) as Asn1AlternativeDef[];
			const idx = alts.findIndex((a) => a.name === cv.kind);
			if (idx < 0)
				throw new EncodingError(`Unknown CHOICE alternative: "${cv.kind}"`);
			const indexBits = bitsNeeded(BigInt(alts.length - 1));
			w.writeBits(idx, indexBits);
			if (aligned && indexBits > 0) w.align();
			perEncodeInto(alts[idx]!.type, cv.value, w, aligned);
			return;
		}

		case "any": {
			const encoded = (value as any)?.encoded ?? new Uint8Array(0);
			perEncodeLengthPrefixedBytes(encoded, w, aligned);
			return;
		}

		default:
			throw new EncodingError(`Cannot PER-encode def kind: ${def.kind}`);
	}
}

function perEncodeSequence(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	value: Record<string, unknown>,
	w: BitBuilder,
	aligned: boolean,
): void {
	// Collect optional/default components
	const components = def.components.flatMap((c) => {
		if (c.kind === "extensionMarker" || c.kind === "componentsOf") return [];
		if (c.kind === "extensionAdditionGroup") return c.components;
		return [c];
	});

	const optionals = components.filter(
		(c) => c.optional || c.defaultValue !== undefined,
	);

	// Encode presence bitmap for optional fields
	if (optionals.length > 0) {
		for (const comp of optionals) {
			const v = value[comp.name];
			const present = v !== undefined && !(v === comp.defaultValue);
			w.writeBit(present ? 1 : 0);
		}
	}

	// Encode each component
	for (const comp of components) {
		const v = value[comp.name];
		if (v === undefined || v === comp.defaultValue) continue;
		perEncodeInto(comp.type, v, w, aligned);
	}
}

function perEncodeStringTo(
	bytes: Uint8Array,
	def: AnyAsn1TypeDef,
	w: BitBuilder,
	aligned: boolean,
): void {
	const size = getSizeConstraint(def);
	if (size && size.lb === size.ub && typeof size.ub !== "string") {
		// Fixed size
		if (aligned && Number(size.lb) > 2) w.align();
		w.writeBytes(bytes);
	} else {
		perEncodeLengthPrefixedBytes(bytes, w, aligned);
	}
}

/** Units per fragment step in a fragmented length determinant (X.691 §10.9.3.8). */
const PER_FRAGMENT_UNIT = 16384;

/**
 * Writes an unfragmented length determinant: one byte below 128, two with the
 * top bit set below 16K (X.691 §10.9.3.6-7).
 */
function perWriteShortLength(len: number, w: BitBuilder): void {
	if (len < 128) {
		w.writeByte(len);
	} else {
		w.writeByte(0x80 | (len >> 8));
		w.writeByte(len & 0xff);
	}
}

/**
 * Writes `count` units as a length-determined sequence, fragmenting above 16K.
 *
 * Fragmentation interleaves length and payload: each fragment is a one-byte
 * header for 1-4 blocks of 16K units followed by those units, and the run ends
 * with an ordinary short determinant for the remainder — which is why this owns
 * writing the payload rather than returning a header for a caller to prepend. A
 * count that is an exact multiple of 16K still ends with a zero-length
 * determinant, without which a decoder cannot tell the run has finished.
 *
 * @param writeRange Emits the units in `[start, end)`.
 */
function perEncodeFragmented(
	count: number,
	w: BitBuilder,
	aligned: boolean,
	writeRange: (start: number, end: number) => void,
): void {
	let written = 0;

	while (count - written >= PER_FRAGMENT_UNIT) {
		const blocks = Math.min(
			4,
			Math.floor((count - written) / PER_FRAGMENT_UNIT),
		);
		if (aligned) {
			w.align();
		}
		w.writeByte(0xc0 | blocks);
		const end = written + blocks * PER_FRAGMENT_UNIT;
		writeRange(written, end);
		written = end;
	}

	if (aligned) {
		w.align();
	}
	perWriteShortLength(count - written, w);
	writeRange(written, count);
}

/** Length-determined octets, fragmented above 16K (X.691 §10.9). */
function perEncodeLengthPrefixedBytes(
	bytes: Uint8Array,
	w: BitBuilder,
	aligned: boolean,
): void {
	perEncodeFragmented(bytes.length, w, aligned, (start, end) => {
		if (aligned) {
			w.align();
		}
		w.writeBytes(bytes.subarray(start, end));
	});
}
