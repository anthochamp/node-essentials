import { IeeeFormat } from "../ieee-format.js";
import { exponentWidth } from "./_exponent-width.js";

/** The all-ones biased exponent value (signals NaN or Infinity): `(1 << w) − 1`. */
export function allOnesExp(format: IeeeFormat): number {
	return (1 << exponentWidth(format)) - 1;
}
