import { MASK_64N } from "@ac-kit/core";

import { Crc64Params } from "./crc-types.js";

/** Bit-reverses the low 64 bits of `value`. */
function reflect64_(value: bigint): bigint {
	let reflected = 0n;
	let remaining = value & MASK_64N;

	for (let i = 0; i < 64; i++) {
		reflected = ((reflected << 1n) | (remaining & 1n)) & MASK_64N;
		remaining >>= 1n;
	}

	return reflected;
}

function buildReflectedTable_(polynomial: bigint): BigUint64Array {
	const reflectedPoly = reflect64_(polynomial);
	const table = new BigUint64Array(256);

	for (let byte = 0; byte < 256; byte++) {
		let crc = BigInt(byte);

		for (let bit = 0; bit < 8; bit++) {
			const shiftedOutOne = (crc & 1n) !== 0n;

			crc >>= 1n;

			if (shiftedOutOne) {
				crc ^= reflectedPoly;
			}
		}

		table[byte] = crc;
	}

	return table;
}

function buildNormalTable_(polynomial: bigint): BigUint64Array {
	const topBit = 1n << 63n;
	const table = new BigUint64Array(256);

	for (let byte = 0; byte < 256; byte++) {
		let crc = BigInt(byte) << 56n;

		for (let bit = 0; bit < 8; bit++) {
			const shiftedOutOne = (crc & topBit) !== 0n;

			crc = (crc << 1n) & MASK_64N;

			if (shiftedOutOne) {
				crc ^= polynomial;
			}
		}

		table[byte] = crc;
	}

	return table;
}

const tableCache_ = new WeakMap<Crc64Params, BigUint64Array>();

function getTable_(params: Crc64Params): BigUint64Array {
	let table = tableCache_.get(params);

	if (!table) {
		table = params.refIn
			? buildReflectedTable_(params.polynomial)
			: buildNormalTable_(params.polynomial);
		tableCache_.set(params, table);
	}

	return table;
}

/**
 * Computes a 64-bit CRC of `data` under the parametrised algorithm `params`.
 *
 * Complexity: O(n) in the byte length of `data`, plus an O(256) one-time table
 * build the first time a given `params` object is used.
 */
export function computeCrc64(data: Uint8Array, params: Crc64Params): bigint {
	const { init, refIn, refOut, xorOut } = params;
	const table = getTable_(params);

	let crc: bigint;

	if (refIn) {
		crc = reflect64_(init);

		for (let i = 0; i < data.length; i++) {
			const index = Number((crc ^ BigInt(data[i]!)) & 0xffn);

			crc = (crc >> 8n) ^ table[index]!;
		}
	} else {
		crc = init & MASK_64N;

		for (let i = 0; i < data.length; i++) {
			const index = Number(((crc >> 56n) ^ BigInt(data[i]!)) & 0xffn);

			crc = ((crc << 8n) & MASK_64N) ^ table[index]!;
		}
	}

	if (refOut !== refIn) {
		crc = reflect64_(crc);
	}

	return (crc ^ xorOut) & MASK_64N;
}
