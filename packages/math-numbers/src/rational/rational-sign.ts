import { Sign } from "@ac-kit/math-algebra";

import { Rational } from "./rational-types.js";

/** The sign of a rational: `-1`, `0` or `1`. */
export function rationalSign(value: Readonly<Rational>): Sign {
	if (value.numerator < 0n) {
		return -1;
	}

	return value.numerator > 0n ? 1 : 0;
}
