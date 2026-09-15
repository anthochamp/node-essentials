import { buildGf2PolynomialTable } from "../_gf2-polynomial.js";
import { CrcParams } from "./crc-types.js";

function widthMask_(width: number): number {
	return width === 32 ? 0xffffffff : (1 << width) - 1;
}

/** Bit-reverses the low `width` bits of `value`. */
function reflect_(value: number, width: number): number {
	let reflected = 0;
	let remaining = value;

	for (let i = 0; i < width; i++) {
		reflected = ((reflected << 1) | (remaining & 1)) >>> 0;
		remaining = remaining >>> 1;
	}

	return reflected;
}

// Bytes consumed LSB-first: the table is built from the reflected polynomial
// and the register shifts right, so no per-byte reflection is needed.
function buildReflectedTable_(polynomial: number, width: number): Uint32Array {
	const mask = widthMask_(width);
	const reflectedPoly = reflect_(polynomial, width) & mask;
	const table = new Uint32Array(256);

	for (let byte = 0; byte < 256; byte++) {
		let crc = byte;

		for (let bit = 0; bit < 8; bit++) {
			const shiftedOutOne = (crc & 1) !== 0;

			crc = crc >>> 1;

			if (shiftedOutOne) {
				crc = (crc ^ reflectedPoly) & mask;
			}
		}

		table[byte] = crc >>> 0;
	}

	return table;
}

// Bytes consumed MSB-first: byte-at-a-time Sarwate table, register shifts
// left. Table generation is one-time per-registration work (see
// `tableCache_`), so building it via the shared bigint-based GF(2) helper
// costs nothing per byte; the per-byte hot loop (`stepNormal_`) stays on
// plain `number` arithmetic.
function buildNormalTable_(polynomial: number, width: number): Uint32Array {
	const wideTable = buildGf2PolynomialTable(BigInt(polynomial), width);
	const table = new Uint32Array(256);

	for (let byte = 0; byte < 256; byte++) {
		table[byte] = Number(wideTable[byte]);
	}

	return table;
}

function stepReflected_(crc: number, byte: number, table: Uint32Array): number {
	return ((crc >>> 8) ^ table[(crc ^ byte) & 0xff]!) >>> 0;
}

function stepNormal_(
	crc: number,
	byte: number,
	table: Uint32Array,
	shift: number,
	mask: number,
): number {
	const index = ((crc >>> shift) ^ byte) & 0xff;
	const shifted = (crc << 8) >>> 0;

	return ((shifted ^ table[index]!) >>> 0) & mask;
}

// One table per distinct `CrcParams` object (named presets are module-level
// singletons), built lazily on first use rather than per call.
const tableCache_ = new WeakMap<CrcParams, Uint32Array>();

function getTable_(params: CrcParams): Uint32Array {
	let table = tableCache_.get(params);

	if (!table) {
		table = params.refIn
			? buildReflectedTable_(params.polynomial, params.width)
			: buildNormalTable_(params.polynomial, params.width);
		tableCache_.set(params, table);
	}

	return table;
}

/**
 * Computes a CRC of `data` under the parametrised algorithm `params`.
 *
 * Complexity: O(n) in the byte length of `data`, plus an O(256) one-time table
 * build the first time a given `params` object is used.
 */
export function computeCrc(data: Uint8Array, params: CrcParams): number {
	const { width, init, refIn, refOut, xorOut } = params;
	const mask = widthMask_(width);
	const table = getTable_(params);

	let crc: number;

	if (refIn) {
		crc = reflect_(init, width) & mask;

		for (let i = 0; i < data.length; i++) {
			crc = stepReflected_(crc, data[i]!, table);
		}
	} else {
		const shift = width - 8;

		crc = init & mask;

		for (let i = 0; i < data.length; i++) {
			crc = stepNormal_(crc, data[i]!, table, shift, mask);
		}
	}

	if (refOut !== refIn) {
		crc = reflect_(crc, width);
	}

	return (((crc ^ xorOut) >>> 0) & mask) >>> 0;
}
