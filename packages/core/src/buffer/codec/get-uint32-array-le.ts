import { getUint32Le } from "./get-uint32-le.js";

/**
 * Reads `byteLength` little-endian bytes from `data` at `offset` into a fresh
 * `Uint32Array`.
 *
 * The inverse of `setUint32ArrayLe`. `byteLength` need not be a multiple of
 * four — a partial final word reads only its leading bytes, which for
 * little-endian is equivalent to zero-padding the missing high bytes, so a
 * value narrower than a word never reads past its own span.
 *
 * @param data - The bytes to read from. The caller is responsible for ensuring
 *   that `byteLength` bytes are available at `offset`.
 * @param offset - The index of the first byte to read.
 * @param byteLength - How many bytes to read.
 * @returns `⌈byteLength / 4⌉` words.
 */
export function getUint32ArrayLe(
	data: Uint8Array,
	offset: number,
	byteLength: number,
): Uint32Array {
	const words = new Uint32Array((byteLength + 3) >>> 2);
	const fullWords = byteLength >> 2;

	for (let word = 0; word < fullWords; word++) {
		words[word] = getUint32Le(data, offset + word * 4);
	}

	const remainder = byteLength - fullWords * 4;

	if (remainder > 0) {
		words[fullWords] = getUint32Le(data, offset + fullWords * 4, remainder);
	}

	return words;
}
