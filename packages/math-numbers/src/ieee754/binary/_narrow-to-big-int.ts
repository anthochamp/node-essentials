import { finiteToBigInt } from "./_finite-to-big-int.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Narrows an operand to `bigint`-backed — identity if it already is, a real
 * (rare) conversion if it arrived from the WASM kernel instead.
 */
export function narrowToBigInt(sf: IeeeBinary): IeeeBinary<bigint> {
	return sf.kind === "finite" ? finiteToBigInt(sf) : sf;
}
