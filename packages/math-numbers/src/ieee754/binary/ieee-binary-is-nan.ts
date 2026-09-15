import { IeeeBinary, IeeeBinaryNaN } from "./ieee-binary-types.js";

/**
 * Whether `value` is a NaN.
 *
 * Reads the discriminant rather than comparing, since the unpacked form names
 * the case directly and `x !== x` has nothing to test here.
 *
 * @param value The value to test.
 * @returns `true` for a NaN of any payload.
 */
export function ieeeBinaryIsNaN(value: IeeeBinary): value is IeeeBinaryNaN {
	return value.kind === "nan";
}
