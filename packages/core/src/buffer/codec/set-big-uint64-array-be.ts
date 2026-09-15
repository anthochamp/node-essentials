import { setBigUint64Be } from "./set-big-uint64-be.js";

/**
 * Writes `words` into `target` at `offset` as big-endian bytes, in place.
 *
 * @param target - The bytes to write into. The caller is responsible for
 *   ensuring that `byteLength` bytes are available at `offset`.
 * @param offset - The index of the first byte to write.
 * @param words - The words to serialize.
 * @param byteLength - How many leading bytes to write. Defaults to all of
 *   `words`. Truncation is byte-granular, not word-granular.
 */
export function setBigUint64ArrayBe(
	target: Uint8Array,
	offset: number,
	words: BigUint64Array,
	byteLength: number = words.length * 8,
): void {
	const fullWords = byteLength >> 3;

	for (let word = 0; word < fullWords; word++) {
		setBigUint64Be(target, offset + word * 8, words[word]!);
	}

	const remainder = byteLength - fullWords * 8;

	if (remainder > 0) {
		const tail = new Uint8Array(8);
		setBigUint64Be(tail, 0, words[fullWords]!);
		target.set(tail.subarray(0, remainder), offset + fullWords * 8);
	}
}
