import { IEEE_FORMAT_BINARY64, IeeeFormat } from "../ieee-format.js";
import { packFromBigInt } from "./_pack-from-big-int.js";
import { toFormat } from "./_to-format.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * The nearest JS `number` to `value`.
 *
 * Exact for binary16/32/64; a binary64 approximation for anything wider, which
 * loses everything past ~15 significant decimal digits.
 *
 * Goes through binary64's own bit pattern rather than `Number(sig) × 2^e`: the
 * latter underflows to zero for any value whose exponent falls below binary64's
 * subnormal floor, where the correct answer is a subnormal rather than zero.
 */
export function ieeeBinaryToNumber(
	value: IeeeBinary,
	format: IeeeFormat,
): number {
	const asBinary64 = toFormat(value, format, IEEE_FORMAT_BINARY64);

	switch (asBinary64.kind) {
		case "nan":
			return NaN;
		case "zero":
			return asBinary64.sign ? -0 : 0;
		case "inf":
			return asBinary64.sign ? -Infinity : Infinity;
		case "finite": {
			const words = packFromBigInt(asBinary64, IEEE_FORMAT_BINARY64);

			return new DataView(words.buffer, words.byteOffset, 8).getFloat64(
				0,
				/* littleEndian */ true,
			);
		}
	}
}
