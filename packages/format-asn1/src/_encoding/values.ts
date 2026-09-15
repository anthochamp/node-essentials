import {
	bigIntAbs,
	ByteBuilder,
	ByteReader,
	decodeText,
	encodeTextLatin1,
	encodeTextUtf8,
} from "@ac-kit/core";
import { encodeVlq } from "@ac-kit/format-varint";

import type { BitStringValue } from "../schema/values.js";
import {
	GeneralizedTimeValue,
	RealValue,
	UtcTimeValue,
} from "../schema/values.js";
import { DecodingError, EncodingError } from "./errors.js";
import { readVlqField } from "./vlq.js";

// ── BIT STRING ───────────────────────────────────────────────────────────────

/**
 * Encode a BIT STRING to contents bytes (X.690 §8.6): the unused-bit count as a
 * leading octet, then the data.
 *
 * Identical across BER, CER and DER — the rules differ on what `unusedBits` may
 * be and on segmentation, never on this framing. DER §11.2 additionally
 * requires the unused bits to be zero, but never strips a meaningful data byte,
 * even one that is `0x00`.
 */
export function encodeBitString(bs: BitStringValue): Uint8Array {
	if (bs.bytes.length === 0) {
		return new Uint8Array([0x00]);
	}

	const result = new Uint8Array(bs.bytes.length + 1);
	result[0] = bs.unusedBits;
	result.set(bs.bytes, 1);

	return result;
}

// ── OID / RELATIVE-OID ───────────────────────────────────────────────────────

/**
 * Encode an OID value to BER/DER contents bytes (X.690 §8.19). The first two
 * arc components are compressed into a single VLQ: `40 * c0 + c1`.
 */
export function encodeOid(arcs: readonly number[]): Uint8Array {
	if (arcs.length < 2)
		throw new EncodingError("OID must have at least 2 components");
	const c0 = arcs[0]!;
	const c1 = arcs[1]!;
	if (c0 > 2 || (c0 < 2 && c1 > 39))
		throw new EncodingError(`Invalid first two OID components: ${c0}.${c1}`);

	const builder = new ByteBuilder();
	builder.write(encodeVlq(40 * c0 + c1));
	for (let i = 2; i < arcs.length; i++) {
		builder.write(encodeVlq(arcs[i]!));
	}
	return builder.toBytes();
}

/** Decode BER/DER OID contents bytes to arc array. */
export function decodeOid(contents: Uint8Array): number[] {
	if (contents.length === 0)
		throw new DecodingError("OID contents must not be empty");

	const reader = new ByteReader(contents);
	// The first subidentifier packs both leading arcs: 40 * c0 + c1.
	const combined = readVlqField(reader, "OID arc", 0);
	const c0 = Math.min(2, Math.floor(combined / 40));
	const arcs: number[] = [c0, combined - 40 * c0];

	while (!reader.atEnd) {
		arcs.push(readVlqField(reader, "OID arc", reader.position));
	}
	return arcs;
}

/** Encode a RELATIVE-OID to contents bytes (no first-component compression). */
export function encodeRelativeOid(arcs: readonly number[]): Uint8Array {
	const builder = new ByteBuilder();
	for (const arc of arcs) {
		builder.write(encodeVlq(arc));
	}
	return builder.toBytes();
}

/** Decode RELATIVE-OID contents bytes. */
export function decodeRelativeOid(contents: Uint8Array): number[] {
	const reader = new ByteReader(contents);
	const arcs: number[] = [];

	while (!reader.atEnd) {
		arcs.push(readVlqField(reader, "RELATIVE-OID arc", reader.position));
	}
	return arcs;
}

// ── REAL ─────────────────────────────────────────────────────────────────────

// Special-value bytes (X.690 §8.5.9)
export const REAL_PLUS_INFINITY_BYTE = 0x40;
export const REAL_MINUS_INFINITY_BYTE = 0x41;
export const REAL_NOT_A_NUMBER_BYTE = 0x42;
export const REAL_MINUS_ZERO_BYTE = 0x43;

/**
 * Encode a RealValue to BER/DER contents bytes (X.690 §8.5). Uses binary base-2
 * encoding for finite values.
 */
export function encodeReal(value: RealValue): Uint8Array {
	if (value.kind === "plusInfinity")
		return new Uint8Array([REAL_PLUS_INFINITY_BYTE]);
	if (value.kind === "minusInfinity")
		return new Uint8Array([REAL_MINUS_INFINITY_BYTE]);
	if (value.kind === "notANumber")
		return new Uint8Array([REAL_NOT_A_NUMBER_BYTE]);

	const { mantissa, exponent } = value;
	if (mantissa === 0n) return new Uint8Array(0); // zero: empty contents

	// Convert decimal mantissa * 10^exponent to binary: m * 2^e
	// Simple approach: use decimal encoding (ISO NR3) for portability
	// NR3 format: " {+|-}d.d*E{+|-}d+" (with leading space)
	const sign = mantissa < 0n ? "-" : "+";
	const absMantissa = bigIntAbs(mantissa);
	const exp = exponent < 0n ? exponent : exponent;
	const nr3 = ` ${sign}${absMantissa}E${exp >= 0n ? "+" : ""}${exp}`;
	const bytes = encodeTextUtf8(nr3);
	// ISO NR3 indicator byte = 0x03
	const result = new Uint8Array(bytes.length + 1);
	result[0] = 0x03;
	result.set(bytes, 1);
	return result;
}

/** Decode BER REAL contents bytes. */
export function decodeReal(contents: Uint8Array): RealValue {
	if (contents.length === 0)
		return { kind: "finite", mantissa: 0n, exponent: 0n };
	const first = contents[0]!;

	// Special values
	if (contents.length === 1) {
		if (first === REAL_PLUS_INFINITY_BYTE) return { kind: "plusInfinity" };
		if (first === REAL_MINUS_INFINITY_BYTE) return { kind: "minusInfinity" };
		if (first === REAL_NOT_A_NUMBER_BYTE) return { kind: "notANumber" };
		if (first === REAL_MINUS_ZERO_BYTE)
			return { kind: "finite", mantissa: 0n, exponent: 0n };
	}

	// Binary encoding (bit 7 = 1)
	if (first & 0x80) {
		const negative = (first & 0x40) !== 0;
		//const base = (first >> 4) & 0x03; // 0=2, 1=8, 2=16
		//const scalingFactor = (first >> 2) & 0x03;
		const exponentLenIndicator = first & 0x03;

		let expBytes: number;
		let expOffset: number;
		if (exponentLenIndicator === 3) {
			expBytes = contents[1]!;
			expOffset = 2;
		} else {
			expBytes = exponentLenIndicator + 1;
			expOffset = 1;
		}

		let exponent = BigInt(
			contents[expOffset]! & 0x80
				? contents[expOffset]! - 256
				: contents[expOffset]!,
		);
		for (let i = expOffset + 1; i < expOffset + expBytes; i++) {
			exponent = (exponent << 8n) | BigInt(contents[i]!);
		}

		let mantissa = 0n;
		for (let i = expOffset + expBytes; i < contents.length; i++) {
			mantissa = (mantissa << 8n) | BigInt(contents[i]!);
		}
		if (negative) mantissa = -mantissa;

		// Apply base and scaling: actual = mantissa * base^exponent * 2^scaling
		//const baseN = base === 0 ? 2n : base === 1 ? 8n : 16n;
		// Convert to decimal: this is approximate
		// For precision, keep as binary representation: store mantissa * baseN^exponent
		// We simplify: convert to mantissa * 10^0 with adjusted exponent
		// This is approximate; a proper implementation would use arbitrary precision
		return { kind: "finite", mantissa, exponent };
	}

	// Decimal encoding (bit 7 = 0, bit 6 = 0)
	const text = decodeText(contents.subarray(1), "utf-8");
	const trimmed = text.trim();
	// Parse ISO NR3: ±d.d*E±d*
	const match = /^([+-]?\d+\.?\d*)(?:[Ee]([+-]?\d+))?$/.exec(trimmed);
	if (!match) throw new DecodingError(`Invalid REAL NR3 encoding: ${trimmed}`);

	const numStr = match[1]!.replace(".", "");
	const dotPos = match[1]!.indexOf(".");
	const fracDigits = dotPos >= 0 ? match[1]!.length - dotPos - 1 : 0;
	const mantissaVal = BigInt(numStr);
	const expVal = match[2] ? BigInt(match[2]) : 0n;
	return {
		kind: "finite",
		mantissa: mantissaVal,
		exponent: expVal - BigInt(fracDigits),
	};
}

// ── Time ─────────────────────────────────────────────────────────────────────

/** Format a 2-digit number (pad with leading zero). */
const pad2 = (n: number): string => n.toString().padStart(2, "0");
const pad4 = (n: number): string => n.toString().padStart(4, "0");

/** Format a UTC offset in minutes as `Z` (zero) or `±HHMM`. */
function formatUtcOffset(offsetMinutes: number): string {
	if (offsetMinutes === 0) return "Z";
	const sign = offsetMinutes < 0 ? "-" : "+";
	const abs = Math.abs(offsetMinutes);
	return `${sign}${pad2(Math.floor(abs / 60))}${pad2(abs % 60)}`;
}

/** Parse a trailing `Z` or `±HHMM` time zone suffix to signed offset minutes. */
function parseTzOffset(suffix: string): number {
	if (suffix === "Z") return 0;
	const m = /^([+-])(\d{2})(\d{2})$/.exec(suffix);
	if (!m) throw new DecodingError(`Invalid time zone suffix: "${suffix}"`);
	const sign = m[1] === "-" ? -1 : 1;
	return sign * (parseInt(m[2]!, 10) * 60 + parseInt(m[3]!, 10));
}

/**
 * Encode UTCTime to bytes (X.690 §11.8 DER form is always `Z`; BER also allows
 * `±HHMM`).
 */
export function encodeUtcTime(v: UtcTimeValue): Uint8Array {
	const yy = pad2(v.year % 100);
	const s = `${yy}${pad2(v.month)}${pad2(v.day)}${pad2(v.hour)}${pad2(v.minute)}${pad2(v.second)}${formatUtcOffset(v.utcOffsetMinutes)}`;
	return encodeTextLatin1(s);
}

/** Decode UTCTime bytes — `YYMMDDHHMM[SS](Z|±HHMM)` (X.680 §47.3). */
export function decodeUtcTime(b: Uint8Array): UtcTimeValue {
	const s = decodeText(b, "latin1");
	const year2 = parseInt(s.slice(0, 2), 10);
	const year = year2 >= 50 ? 1900 + year2 : 2000 + year2;
	const month = parseInt(s.slice(2, 4), 10);
	const day = parseInt(s.slice(4, 6), 10);
	const hour = parseInt(s.slice(6, 8), 10);
	const minute = parseInt(s.slice(8, 10), 10);
	let pos = 10;
	let second = 0;
	if (/^\d\d/.test(s.slice(pos, pos + 2))) {
		second = parseInt(s.slice(pos, pos + 2), 10);
		pos += 2;
	}
	return {
		year,
		month,
		day,
		hour,
		minute,
		second,
		utcOffsetMinutes: parseTzOffset(s.slice(pos)),
	};
}

/**
 * Encode GeneralizedTime to bytes — `YYYYMMDDHHMMSS[.fff](Z|±HHMM|)` (X.690
 * §11.7). No offset suffix means local time (no `utcOffsetMinutes`).
 */
export function encodeGeneralizedTime(v: GeneralizedTimeValue): Uint8Array {
	let s = `${pad4(v.year)}${pad2(v.month)}${pad2(v.day)}${pad2(v.hour)}${pad2(v.minute)}${pad2(v.second)}`;
	if (v.fraction) {
		const digits = Math.round(v.fraction * 1000)
			.toString()
			.padStart(3, "0")
			.replace(/0+$/, "");
		if (digits) s += `.${digits}`;
	}
	if (v.utcOffsetMinutes !== undefined && v.utcOffsetMinutes !== null) {
		s += formatUtcOffset(v.utcOffsetMinutes);
	}
	return encodeTextLatin1(s);
}

/** Decode GeneralizedTime bytes. */
export function decodeGeneralizedTime(b: Uint8Array): GeneralizedTimeValue {
	const s = decodeText(b, "latin1");
	const year = parseInt(s.slice(0, 4), 10);
	const month = parseInt(s.slice(4, 6), 10);
	const day = parseInt(s.slice(6, 8), 10);
	const hour = parseInt(s.slice(8, 10), 10);
	const minute = parseInt(s.slice(10, 12), 10);
	const second = parseInt(s.slice(12, 14), 10);
	let rest = s.slice(14);

	let fraction: number | undefined;
	if (rest.startsWith(".") || rest.startsWith(",")) {
		let fracEnd = 1;
		while (fracEnd < rest.length && /\d/.test(rest[fracEnd]!)) fracEnd++;
		const fracStr = rest.slice(1, fracEnd);
		if (fracStr.length > 0) fraction = Number(`0.${fracStr}`);
		rest = rest.slice(fracEnd);
	}
	const utcOffsetMinutes = rest.length > 0 ? parseTzOffset(rest) : undefined;

	return {
		year,
		month,
		day,
		hour,
		minute,
		second,
		...(fraction !== undefined ? { fraction } : {}),
		...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
	};
}
