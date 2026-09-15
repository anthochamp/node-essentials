import { IeeeSign } from "../common/ieee-sign.js";
import { IeeeFormat } from "../ieee-format.js";

/** Extract the sign bit (bit `k − 1`). */
export function getSign(words: Uint32Array, format: IeeeFormat): IeeeSign {
	const pos = format.k - 1;

	return ((words[pos >>> 5]! >>> (pos & 31)) & 1) as IeeeSign;
}
