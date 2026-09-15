import {
	DIGIT_NINE,
	DIGIT_ZERO,
	LOWERCASE_A,
	LOWERCASE_Z,
	UPPERCASE_A,
	UPPERCASE_Z,
} from "../constants/ascii.js";

const PREFIXES_: ReadonlyMap<string, number> = new Map([
	["0b", 2],
	["0o", 8],
	["0x", 16],
]);

/**
 * Parses `text` as a `bigint` in `radix` — the `bigint` sibling of `parseInt`,
 * and the radix `BigInt()` never took.
 *
 * `BigInt("ff")` throws and there is no `BigInt(text, radix)`, so a `bigint`
 * cannot be read from anything but decimal or a `0b`/`0o`/`0x` literal without
 * this. Every radix from 2 to 36 is accepted, digits are case-insensitive, and
 * surrounding whitespace is ignored.
 *
 * Unlike `parseInt` this is **strict**: a character `radix` does not define
 * throws rather than silently ending the number, so `bigIntParse("12abc")` is
 * an error and not `12n`. `parseInt` reports that case as `NaN`, which a
 * `bigint` has no equivalent of.
 *
 * A `0b`/`0o`/`0x` prefix is accepted when it agrees with `radix`, and selects
 * one when `radix` is omitted, matching `BigInt()`. A sign may precede it.
 *
 * O(n²/k) for an n-digit input, where k is how many `radix` digits fit in a
 * safe integer — the accumulator grows as it goes, the same shape as the
 * engine's own decimal conversion.
 *
 * @param text The digits to read, optionally signed and prefixed.
 * @param radix The base, from 2 to 36. Defaults to the prefix's base, or 10.
 * @returns The value as a `bigint`.
 * @throws {RangeError} If `radix` is not an integer in `[2, 36]`, or a prefix
 *   contradicts it.
 * @throws {SyntaxError} If `text` holds no digits, or holds one `radix` does
 *   not define.
 */
export function bigIntParse(text: string, radix?: number): bigint {
	if (
		radix !== undefined &&
		(!Number.isInteger(radix) || radix < 2 || radix > 36)
	) {
		throw new RangeError(`bigIntParse: radix must be in [2, 36], got ${radix}`);
	}

	const trimmed = text.trim();
	const negative = trimmed.startsWith("-");
	let digits = negative || trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;

	const prefixed = PREFIXES_.get(digits.slice(0, 2).toLowerCase());

	if (prefixed !== undefined) {
		if (radix !== undefined && radix !== prefixed) {
			throw new RangeError(
				`bigIntParse: ${digits.slice(0, 2)} prefix contradicts radix ${radix}`,
			);
		}

		digits = digits.slice(2);
	}

	const base = radix ?? prefixed ?? 10;

	if (digits.length === 0) {
		throw new SyntaxError(`bigIntParse: no digits in ${JSON.stringify(text)}`);
	}

	if (!isRadixDigits_(digits, base)) {
		throw new SyntaxError(
			`bigIntParse: ${JSON.stringify(text)} is not a base-${base} integer`,
		);
	}

	// The engine's decimal conversion is native code; only beat it off that path.
	const magnitude = base === 10 ? BigInt(digits) : accumulate_(digits, base);

	return negative ? -magnitude : magnitude;
}

function isRadixDigits_(digits: string, radix: number): boolean {
	for (let index = 0; index < digits.length; index++) {
		const code = digits.charCodeAt(index);
		let digit: number;

		if (code >= DIGIT_ZERO && code <= DIGIT_NINE) {
			digit = code - DIGIT_ZERO;
		} else if (code >= LOWERCASE_A && code <= LOWERCASE_Z) {
			digit = code - LOWERCASE_A + 10;
		} else if (code >= UPPERCASE_A && code <= UPPERCASE_Z) {
			digit = code - UPPERCASE_A + 10;
		} else {
			return false;
		}

		if (digit >= radix) {
			return false;
		}
	}

	return true;
}

function accumulate_(digits: string, base: number): bigint {
	// Widest digit run still worth one `Number.parseInt`, so each bigint
	// multiply-add absorbs many digits rather than one.
	let chunkSize = 1;

	for (
		let limit = base;
		limit * base <= Number.MAX_SAFE_INTEGER;
		limit *= base
	) {
		chunkSize++;
	}

	const chunkScale = BigInt(base) ** BigInt(chunkSize);
	// A short leading chunk leaves every later one full width.
	const lead = digits.length % chunkSize || chunkSize;
	let magnitude = BigInt(Number.parseInt(digits.slice(0, lead), base));

	for (let index = lead; index < digits.length; index += chunkSize) {
		magnitude =
			magnitude * chunkScale +
			BigInt(Number.parseInt(digits.slice(index, index + chunkSize), base));
	}

	return magnitude;
}
