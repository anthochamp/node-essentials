import { Sign } from "@ac-kit/math-algebra";

import { Decimal } from "./decimal-types.js";

/** The sign of a decimal: `-1`, `0` or `1`. */
export function decimalSign(value: Readonly<Decimal>): Sign {
	if (value.coefficient < 0n) {
		return -1;
	}

	return value.coefficient > 0n ? 1 : 0;
}
