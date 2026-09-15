import { MASK_32N } from "../../constants/mask.js";
import { setUint32Be } from "./set-uint32-be.js";

/**
 * Writes `value` into `target` at `offset` as a big-endian unsigned 64-bit
 * integer.
 *
 * The caller is responsible for ensuring that eight bytes are available at
 * `offset`.
 *
 * @param target - The bytes to write into.
 * @param offset - The index of the first byte to write.
 * @param value - The value to write; only its low 64 bits are used.
 */
export function setBigUint64Be(
	target: Uint8Array,
	offset: number,
	value: bigint,
): void {
	setUint32Be(target, offset, Number((value >> 32n) & MASK_32N));
	setUint32Be(target, offset + 4, Number(value & MASK_32N));
}
