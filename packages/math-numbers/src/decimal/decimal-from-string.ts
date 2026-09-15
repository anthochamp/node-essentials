import { decimalNormalize } from "./_normalize.js";
import { Decimal } from "./decimal-types.js";

/**
 * Parses a decimal string such as `"3.14"`, `"-0.001"` or `"1.23e-5"`.
 *
 * @throws {SyntaxError} When the string is not a valid decimal number.
 */
export function decimalFromString(text: string): Decimal {
	let rest = text.trim();
	const negative = rest.startsWith("-");

	if (negative || rest.startsWith("+")) {
		rest = rest.slice(1);
	}

	const exponentIndex = rest.search(/[eE]/);
	let mantissa = rest;
	let scientificExponent = 0;

	if (exponentIndex >= 0) {
		scientificExponent = Number.parseInt(rest.slice(exponentIndex + 1), 10);
		mantissa = rest.slice(0, exponentIndex);

		if (Number.isNaN(scientificExponent)) {
			throw new SyntaxError(`Invalid decimal string: ${text}`);
		}
	}

	const dotIndex = mantissa.indexOf(".");
	const digits =
		dotIndex >= 0
			? mantissa.slice(0, dotIndex) + mantissa.slice(dotIndex + 1)
			: mantissa;
	const fractionalExponent =
		dotIndex >= 0 ? -(mantissa.length - dotIndex - 1) : 0;

	if (!/^\d+$/.test(digits)) {
		throw new SyntaxError(`Invalid decimal string: ${text}`);
	}

	return decimalNormalize(
		negative ? -BigInt(digits) : BigInt(digits),
		fractionalExponent + scientificExponent,
	);
}
