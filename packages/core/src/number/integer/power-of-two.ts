import { DBL_MANT_DIG } from "../../constants/float.js";

/** Returns `true` if `n` is a power of two, `false` otherwise. */
export function isPowerOfTwo(n: number): boolean | null {
	if (n < 0) throw new RangeError("Input must be a non-negative bigint.");
	if (n === 0) return false;
	if (!Number.isSafeInteger(n)) return null;

	let logValue = Math.log2(n);

	return Number.isInteger(logValue) && Math.pow(2, logValue) === n;
}

/** Returns the smallest power of two greater than or equal to `n`. */
export function nextPowerOfTwo(n: number): number | null {
	if (n < 0) throw new RangeError("Input must be a non-negative bigint.");
	if (n <= 1) return 1;
	if (!Number.isSafeInteger(n)) return null;

	for (let i = 0; i < DBL_MANT_DIG; i++) {
		if (n <= 2 ** i) return 2 ** i;
	}

	return null;
}

/** Returns the largest power of two less than or equal to `n`. */
export function previousPowerOfTwo(n: number): number | null {
	if (n <= 0) throw new RangeError("Input must be a positive bigint.");
	if (n === 1) return 1;
	if (!Number.isSafeInteger(n)) return null;

	for (let i = DBL_MANT_DIG - 1; i >= 0; i--) {
		if (n >= 2 ** i) return 2 ** i;
	}

	return null;
}
