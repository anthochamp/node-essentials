import { BitReader, bytesForBits, decodeText } from "@ac-kit/core";
import { bigIntFromBytesBe } from "@ac-kit/math-integer";

import { DecodingError } from "../_encoding/errors.js";
import { decodeOid, decodeReal } from "../_encoding/values.js";
import { DefValueOf } from "../schema/def.js";
import { AnyAsn1TypeDef } from "../schema/types/any-def.js";
import type { Asn1AlternativeDef } from "../schema/types/constructed/component.js";
import type { Asn1SequenceTypeDef } from "../schema/types/constructed/sequence.js";
import type { Asn1SetTypeDef } from "../schema/types/constructed/set.js";
import { BitStringValue } from "../schema/values.js";
import { bitsNeeded, getSizeConstraint, getValueRange } from "./constraints.js";

export interface PerDecodeOptions {
	readonly aligned?: boolean;
}

export function perDecode<D extends AnyAsn1TypeDef>(
	def: D,
	bytes: Uint8Array,
	opts: PerDecodeOptions = {},
): DefValueOf<D> {
	const reader = new BitReader(bytes);
	return perDecodeFrom(def, reader, opts.aligned ?? true) as DefValueOf<D>;
}

function perDecodeFrom(
	def: AnyAsn1TypeDef,
	r: BitReader,
	aligned: boolean,
): unknown {
	if (def.kind === "lazy") return perDecodeFrom(def.getter(), r, aligned);
	if (def.kind === "transform") return perDecodeFrom(def.innerType, r, aligned);
	if (def.kind === "tagged") return perDecodeFrom(def.innerType, r, aligned);

	switch (def.kind) {
		case "boolean":
			return r.readBit() !== 0;

		case "integer":
		case "enumerated": {
			const range = getValueRange(def);
			if (
				range &&
				typeof range.lb !== "string" &&
				typeof range.ub !== "string"
			) {
				const lb = range.lb;
				const ub = range.ub;
				const span = ub - lb;
				const bits = bitsNeeded(span);
				if (aligned && bits > 8 && bits <= 16) {
					r.align();
					return lb + BigInt(r.readBits(16));
				}
				if (aligned && bits > 16 && bits <= 32) {
					r.align();
					return lb + BigInt(r.readBits(32));
				}
				if (aligned && bits > 32) {
					r.align();
					const len = r.readByte();
					const bs = r.readBytes(len);
					return lb + bigIntFromBytesBe(new Uint8Array(bs));
				}
				return lb + BigInt(r.readBits(bits));
			}
			if (aligned) r.align();
			const len = r.readByte();
			const bs = r.readBytes(len);
			return bigIntFromBytesBe(new Uint8Array(bs));
		}

		case "bitString": {
			const size = getSizeConstraint(def);
			if (size && size.lb === size.ub && typeof size.ub !== "string") {
				const bitLen = Number(size.lb);
				if (aligned && bitLen > 16) r.align();
				const byteLen = bytesForBits(bitLen);
				return {
					bytes: new Uint8Array(r.readBytes(byteLen)),
					unusedBits: byteLen * 8 - bitLen,
				} satisfies BitStringValue;
			}

			// A whole fragment is 16K bits — a byte boundary — so only the final
			// partial one can end mid-octet.
			const parts: Uint8Array[] = [];
			let bitLen = 0;
			perDecodeFragmented(r, aligned, (count) => {
				if (aligned) r.align();
				parts.push(new Uint8Array(r.readBytes(bytesForBits(count))));
				bitLen += count;
			});

			const byteLen = bytesForBits(bitLen);
			const bytes = new Uint8Array(byteLen);
			let offset = 0;
			for (const part of parts) {
				bytes.set(part, offset);
				offset += part.length;
			}
			return {
				bytes,
				unusedBits: byteLen * 8 - bitLen,
			} satisfies BitStringValue;
		}

		case "octetString": {
			const size = getSizeConstraint(def);
			if (size && size.lb === size.ub && typeof size.ub !== "string") {
				const len = Number(size.lb);
				if (aligned && len > 2) r.align();
				return new Uint8Array(r.readBytes(len));
			}
			return perDecodeLengthPrefixedBytes(r, aligned);
		}

		case "null":
			return null;

		case "objectIdentifier":
			return decodeOid(perDecodeLengthPrefixedBytes(r, aligned));

		case "real":
			return decodeReal(perDecodeLengthPrefixedBytes(r, aligned));

		case "utf8String": {
			const bytes = perDecodeString(def, r, aligned);
			return decodeText(bytes, "utf-8", { fatal: true });
		}

		case "numericString":
		case "printableString":
		case "teletexString":
		case "videotexString":
		case "ia5String":
		case "graphicString":
		case "visibleString":
		case "generalString": {
			const bytes = perDecodeString(def, r, aligned);
			return decodeText(bytes, "latin1");
		}

		case "bmpString": {
			const bytes = perDecodeString(def, r, aligned);
			return decodeText(bytes, "utf-16be");
		}

		case "utcTime":
		case "generalizedTime":
		case "time":
		case "date":
		case "timeOfDay":
		case "dateTime":
		case "duration": {
			return decodeText(perDecodeLengthPrefixedBytes(r, aligned), "latin1");
		}

		case "sequence":
		case "set":
			return perDecodeSequence(def, r, aligned);

		case "sequenceOf":
		case "setOf": {
			const size = getSizeConstraint(def);
			const elementDef = def.elementType;
			if (size && size.lb === size.ub && typeof size.ub !== "string") {
				const count = Number(size.lb);
				return Array.from({ length: count }, () =>
					perDecodeFrom(elementDef, r, aligned),
				);
			}

			const items: unknown[] = [];
			perDecodeFragmented(r, aligned, (count) => {
				for (let index = 0; index < count; index++) {
					items.push(perDecodeFrom(elementDef, r, aligned));
				}
			});
			return items;
		}

		case "choice": {
			const alts = def.alternatives.filter(
				(a) =>
					!("kind" in a) ||
					(a.kind !== "extensionMarker" && a.kind !== "extensionAdditionGroup"),
			) as Asn1AlternativeDef[];
			const indexBits = bitsNeeded(BigInt(alts.length - 1));
			const idx = r.readBits(indexBits);
			if (aligned && indexBits > 0) r.align();
			const altDef = alts[idx];
			if (!altDef)
				throw new DecodingError(`PER: CHOICE index ${idx} out of range`);
			return {
				kind: altDef.name,
				value: perDecodeFrom(altDef.type, r, aligned),
			};
		}

		case "any": {
			return { encoded: perDecodeLengthPrefixedBytes(r, aligned) };
		}

		default:
			throw new DecodingError(`Cannot PER-decode def kind: ${def.kind}`);
	}
}

function perDecodeSequence(
	def: Asn1SequenceTypeDef | Asn1SetTypeDef,
	r: BitReader,
	aligned: boolean,
): Record<string, unknown> {
	const components = def.components.flatMap((c) => {
		if (c.kind === "extensionMarker" || c.kind === "componentsOf") return [];
		if (c.kind === "extensionAdditionGroup") return c.components;
		return [c];
	});

	const optionals = components.filter(
		(c) => c.optional || c.defaultValue !== undefined,
	);
	const presence: boolean[] = [];
	for (let i = 0; i < optionals.length; i++) {
		presence.push(r.readBit() !== 0);
	}

	const result: Record<string, unknown> = {};
	let optIdx = 0;
	for (const comp of components) {
		const isOptional = comp.optional || comp.defaultValue !== undefined;
		if (isOptional) {
			if (presence[optIdx++]) {
				result[comp.name] = perDecodeFrom(comp.type, r, aligned);
			} else if (comp.defaultValue !== undefined) {
				result[comp.name] = comp.defaultValue;
			}
		} else {
			result[comp.name] = perDecodeFrom(comp.type, r, aligned);
		}
	}
	return result;
}

function perDecodeString(
	def: AnyAsn1TypeDef,
	r: BitReader,
	aligned: boolean,
): Uint8Array {
	const size = getSizeConstraint(def);
	if (size && size.lb === size.ub && typeof size.ub !== "string") {
		const len = Number(size.lb);
		if (aligned && len > 2) r.align();
		return new Uint8Array(r.readBytes(len));
	}
	return perDecodeLengthPrefixedBytes(r, aligned);
}

/** Units per fragment step in a fragmented length determinant (X.691 §10.9.3.8). */
const PER_FRAGMENT_UNIT = 16384;

type PerLengthRun = {
	/** Units in this fragment. */
	readonly count: number;
	/** Whether more fragments follow this one. */
	readonly more: boolean;
};

/**
 * Reads one length determinant (X.691 §10.9).
 *
 * A `0b11mmmmmm` byte is a fragment header for `m` blocks of 16K units, with
 * the payload following it and another determinant after that; anything else
 * terminates the run.
 */
function perReadLengthDeterminant(
	r: BitReader,
	aligned: boolean,
): PerLengthRun {
	if (aligned) {
		r.align();
	}

	const b0 = r.readByte();
	if ((b0 & 0x80) === 0) {
		return { count: b0, more: false };
	}
	if ((b0 & 0xc0) === 0x80) {
		return { count: ((b0 & 0x3f) << 8) | r.readByte(), more: false };
	}

	const blocks = b0 & 0x3f;
	if (blocks < 1 || blocks > 4) {
		throw new DecodingError(
			`PER: fragmented length determinant has ${blocks} blocks, expected 1-4`,
		);
	}
	return { count: blocks * PER_FRAGMENT_UNIT, more: true };
}

/**
 * Reads a length-determined run of units, reassembling fragments.
 *
 * @param readUnits Consumes exactly `count` units and appends them.
 */
function perDecodeFragmented(
	r: BitReader,
	aligned: boolean,
	readUnits: (count: number) => void,
): void {
	for (;;) {
		const { count, more } = perReadLengthDeterminant(r, aligned);
		readUnits(count);
		if (!more) {
			return;
		}
	}
}

/** Length-determined octets, reassembled across fragments (X.691 §10.9). */
function perDecodeLengthPrefixedBytes(
	r: BitReader,
	aligned: boolean,
): Uint8Array {
	const parts: Uint8Array[] = [];
	let total = 0;

	perDecodeFragmented(r, aligned, (count) => {
		if (aligned) {
			r.align();
		}
		const part = new Uint8Array(r.readBytes(count));
		parts.push(part);
		total += part.length;
	});

	if (parts.length === 1) {
		return parts[0] as Uint8Array;
	}

	const joined = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		joined.set(part, offset);
		offset += part.length;
	}
	return joined;
}
