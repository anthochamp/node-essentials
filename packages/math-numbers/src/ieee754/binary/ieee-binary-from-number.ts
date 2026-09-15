import { IEEE_FORMAT_BINARY64, IeeeFormat } from "../ieee-format.js";
import { toFormat } from "./_to-format.js";
import { unpackToBigInt } from "./_unpack-to-big-int.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * The value of a JS `number`, in the given format.
 *
 * Narrower formats (binary16/32) round; wider ones (binary128) are exact, the
 * input carrying only binary64's ~15 significant decimal digits to begin with.
 */
export function ieeeBinaryFromNumber(
	value: number,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const asBinary64 = unpackToBigInt(packNumber_(value), IEEE_FORMAT_BINARY64);

	if (format.p === IEEE_FORMAT_BINARY64.p) {
		return asBinary64;
	}

	return toFormat(asBinary64, IEEE_FORMAT_BINARY64, format);
}

/** The hardware's own binary64 bit pattern — exact by construction. */
function packNumber_(value: number): Uint32Array {
	const words = new Uint32Array(2);

	new DataView(words.buffer).setFloat64(0, value, /* littleEndian */ true);

	return words;
}
