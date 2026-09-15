import {
	IeeeBinary,
	IeeeBinaryFinite,
	IeeeBinaryZero,
} from "./ieee-binary-types.js";

/**
 * Whether `value` is finite — a real number rather than an infinity or a NaN.
 *
 * Zero counts, as it does for `Number.isFinite`.
 *
 * @param value The value to test.
 * @returns `true` for a finite value, including either zero.
 */
export function ieeeBinaryIsFinite<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
>(value: IeeeBinary<TSig>): value is IeeeBinaryFinite<TSig> | IeeeBinaryZero {
	return value.kind === "finite" || value.kind === "zero";
}
