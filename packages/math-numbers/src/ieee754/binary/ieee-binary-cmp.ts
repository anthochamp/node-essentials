import { Sign } from "@ac-kit/math-algebra";

import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Three-way comparison: returns −1, 0, or +1. The one implementation — not
 * accelerated, not swappable.
 *
 * @throws {RangeError} Either operand is NaN (NaN is unordered in IEEE 754).
 */
export function ieeeBinaryCmp(a: IeeeBinary, b: IeeeBinary): Sign {
	const na = narrowToBigInt(a);
	const nb = narrowToBigInt(b);

	if (na.kind === "nan" || nb.kind === "nan") {
		throw new RangeError("Cannot compare NaN values");
	}

	// Determine the "directed" sign of each operand (+/- for inf and finite)
	const aNeg = na.kind !== "zero" && na.sign === 1;
	const bNeg = nb.kind !== "zero" && nb.sign === 1;

	if (aNeg !== bNeg) return aNeg ? -1 : 1;

	// Same sign — compare magnitudes, then flip if both negative
	const flip = aNeg;

	if (na.kind === "inf" && nb.kind === "inf") return 0;
	if (na.kind === "inf") return flip ? -1 : 1;
	if (nb.kind === "inf") return flip ? 1 : -1;

	if (na.kind === "zero" && nb.kind === "zero") return 0;
	if (na.kind === "zero") return flip ? 1 : -1;
	if (nb.kind === "zero") return flip ? -1 : 1;

	// Both finite: compare exponent, then significand
	if (na.exp !== nb.exp) {
		const r = na.exp > nb.exp ? 1 : -1;
		return (flip ? -r : r) as Sign;
	}
	if (na.sig !== nb.sig) {
		const r = na.sig > nb.sig ? 1 : -1;
		return (flip ? -r : r) as Sign;
	}
	return 0;
}
