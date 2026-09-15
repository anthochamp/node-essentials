import { bigIntAbs, bigIntPow10 } from "@ac-kit/core";

import { Decimal } from "./decimal-types.js";

/**
 * The numeral for a decimal, in plain positional notation with no exponent and
 * no separators — `coefficient × 10^exponent` written out.
 *
 * **Exact in base ten**, always. In any other radix a decimal fraction almost
 * never terminates, so the expansion is cut once it carries as much information
 * as the value's own significant digits do, plus a guard digit — the same
 * intrinsic limit `Number.prototype.toString` applies, which is why
 * `(0.1).toString(16)` answers `"0.1999999999999a"` rather than running
 * forever. Where the expansion does terminate the cut never happens and the
 * answer stays exact.
 *
 * Leading zeros in the fraction do not count against the limit, carrying no
 * information; `0.00001` keeps all five of its places.
 *
 * Locale-aware rendering is `INum.format`'s job, via `Intl.NumberFormat`, which
 * takes a numeral like this one as its input.
 *
 * O(d) big-integer operations for `d` fraction digits emitted.
 *
 * @param value The decimal to render.
 * @param radix The base, from 2 to 36. Defaults to 10.
 * @returns The numeral.
 * @throws {RangeError} If `radix` is not an integer in `[2, 36]`.
 */
export function decimalToString(value: Readonly<Decimal>, radix = 10): string {
	if (!Number.isInteger(radix) || radix < 2 || radix > 36) {
		throw new RangeError(
			`decimalToString: radix must be in [2, 36], got ${radix}`,
		);
	}

	const { coefficient, exponent, precision } = value;

	if (coefficient === 0n) {
		return "0";
	}

	const sign = coefficient < 0n ? "-" : "";
	const magnitude = bigIntAbs(coefficient);

	if (exponent >= 0) {
		return sign + (magnitude * bigIntPow10(exponent)).toString(radix);
	}

	const scale = bigIntPow10(-exponent);
	const integer = (magnitude / scale).toString(radix);
	let remainder = magnitude % scale;

	if (remainder === 0n) {
		return sign + integer;
	}

	// One decimal digit buys log(10)/log(radix) radix digits; the guard is what
	// makes the numeral read back as the same value, as `DBL_DECIMAL_DIG` is to
	// `DBL_DIG`.
	const limit = Math.ceil(precision * (Math.log(10) / Math.log(radix))) + 1;
	const base = BigInt(radix);
	let significant = 0;
	let fraction = "";

	while (remainder !== 0n && significant < limit) {
		remainder *= base;

		const digit = remainder / scale;

		remainder %= scale;
		fraction += digit.toString(radix);

		if (digit !== 0n || significant > 0) {
			significant++;
		}
	}

	return `${sign}${integer}.${fraction}`;
}
