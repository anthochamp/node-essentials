import { setUint32Be } from "./set-uint32-be.js";

/**
 * Writes `words` into `target` at `offset` as big-endian bytes, in place.
 *
 * @param target - The bytes to write into. The caller is responsible for
 *   ensuring that `byteLength` bytes are available at `offset`.
 * @param offset - The index of the first byte to write.
 * @param words - The words to serialize.
 * @param byteLength - How many leading bytes to write. Defaults to all of
 *   `words`. Truncation is byte-granular, not word-granular — e.g. BLAKE2s
 *   accepts any output length from 1 to 32 bytes, not just multiples of 4 — so
 *   a truncated final word writes only its leading bytes, never spilling past
 *   `offset + byteLength` into whatever follows in `target`.
 */
export function setUint32ArrayBe(
	target: Uint8Array,
	offset: number,
	words: Uint32Array,
	byteLength: number = words.length * 4,
): void {
	const fullWords = byteLength >> 2;

	for (let word = 0; word < fullWords; word++) {
		setUint32Be(target, offset + word * 4, words[word]!);
	}

	const remainder = byteLength - fullWords * 4;

	if (remainder > 0) {
		const tail = new Uint8Array(4);
		setUint32Be(tail, 0, words[fullWords]!);
		target.set(tail.subarray(0, remainder), offset + fullWords * 4);
	}
}
