import { IeeeFormat } from "../ieee-format.js";

/**
 * Exponent bias: equals `emax` for IEEE 754 binary formats. `unbiasedExp =
 * biasedExp − bias`.
 */
export function exponentBias(format: IeeeFormat): number {
	return format.emax;
}
