import { MASK_64N } from "../../constants/mask.js";

/** Masks a `bigint` to 64 bits, returning the low 64 bits of the value. */
export function mask64(value: bigint): bigint {
	return value & MASK_64N;
}
