import type { Sign } from "@ac-kit/math-algebra";

import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * The sign of `value` as `-1`, `0` or `1`.
 *
 * Zero answers `0` for either sign bit, so `sign(-0) === sign(0)`: the two are
 * equal as numbers, and comparison and equality must agree. A caller that needs
 * the sign bit itself reads `value.sign`.
 *
 * A NaN also answers `0`, which is a lie — it is neither positive, negative nor
 * zero, and `Math.sign(NaN)` is `NaN`. `Sign` has no member that could say so,
 * and widening the return type would cost every caller a check for a case most
 * of them have already excluded.
 *
 * @param value The value to test.
 * @returns `-1`, `0` or `1`.
 */
export function ieeeBinarySign(value: IeeeBinary): Sign {
	switch (value.kind) {
		case "zero":
		case "nan":
			return 0;
		default:
			return value.sign === 1 ? -1 : 1;
	}
}
