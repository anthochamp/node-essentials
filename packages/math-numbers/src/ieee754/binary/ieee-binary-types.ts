import { IeeeSign } from "../common/ieee-sign.js";

/**
 * A finite, non-zero IEEE 754 binary value in pseudo-normal form.
 *
 * `TSig` is the kernel-native significand representation: `bigint` for the
 * portable fallback kernel, a little-endian `Uint32Array` of limbs for the WASM
 * one. Bare `IeeeBinaryFinite`/`IeeeBinary` (the default, either
 * representation) is the right type for anything accepting a value from an
 * unknown source; `IeeeBinaryFinite<bigint>`/`IeeeBinaryFinite<Uint32Array>`
 * says precisely which representation a function produces.
 */
export type IeeeBinaryFinite<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = {
	readonly kind: "finite";
	readonly sign: IeeeSign;
	/** Unbiased exponent. The value is `(−1)^sign × sig × 2^(exp − (p − 1))`. */
	readonly exp: number;
	/**
	 * `p`-bit significand with implicit leading 1 at bit `p − 1`. Subnormals are
	 * shifted into this form (exp adjusted accordingly).
	 */
	readonly sig: TSig;
};

export type IeeeBinaryZero = {
	readonly kind: "zero";
	readonly sign: IeeeSign;
};
export type IeeeBinaryInf = {
	readonly kind: "inf";
	readonly sign: IeeeSign;
};
/** The NaN payload is the trailing significand field (non-zero). */
export type IeeeBinaryNaN = {
	readonly kind: "nan";
	readonly payload: bigint;
};

export type IeeeBinary<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = IeeeBinaryFinite<TSig> | IeeeBinaryZero | IeeeBinaryInf | IeeeBinaryNaN;

/** Canonical quiet NaN. */
export const IEEE_BINARY_NAN = Object.freeze<IeeeBinaryNaN>({
	kind: "nan",
	payload: 1n,
});
