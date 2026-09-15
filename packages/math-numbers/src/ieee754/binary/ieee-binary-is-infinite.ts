import { IeeeBinary, IeeeBinaryInf } from "./ieee-binary-types.js";

/**
 * Whether `value` is an infinity of either sign.
 *
 * @param value The value to test.
 * @returns `true` for `+∞` and `-∞`.
 */
export function ieeeBinaryIsInfinite(
	value: IeeeBinary,
): value is IeeeBinaryInf {
	return value.kind === "inf";
}
