import { bigIntAbs } from "@ac-kit/core";

import { bigIntGcd } from "./gcd.js";

/** Least common multiple. Zero when either operand is zero. */
export function bigIntLcm(a: bigint, b: bigint): bigint {
	if (a === 0n || b === 0n) {
		return 0n;
	}

	const product = bigIntAbs(a) * bigIntAbs(b);

	return product / bigIntGcd(a, b);
}
