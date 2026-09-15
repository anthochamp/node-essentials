import { ComparatorResult } from "@ac-kit/core";

import { decimalAligned } from "./_aligned-coefficients.js";
import { Decimal } from "./decimal-types.js";

/** Three-way comparison, by aligning exponents. */
export function decimalCompare(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
): ComparatorResult {
	const [left, right] = decimalAligned(a, b);

	if (left < right) {
		return -1;
	}

	return left > right ? 1 : 0;
}
