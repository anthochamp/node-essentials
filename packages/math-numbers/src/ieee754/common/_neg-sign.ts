import { IeeeSign } from "./ieee-sign.js";

/** Negate the sign of any finite / zero / inf value (NaN is unchanged). */
export function negSign(s: IeeeSign): IeeeSign {
	return s === 0 ? 1 : 0;
}
