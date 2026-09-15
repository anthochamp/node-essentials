// ---------------------------------------------------------------------------
// IEEE 754-2008 format parameters
// References:
//
// IEEE 754-2008, §3.3 (binary formats) and §3.4 (decimal formats)
// ---------------------------------------------------------------------------

/** IEEE 754 interchange format. */
export type IeeeFormat = {
	/**
	 * Total storage width in bits.
	 *
	 * `k = 1 (sign) + w (exponent) + t (trailing significand)`.
	 */
	readonly k: number;

	/** Precision in digits (significand, including leading digit). */
	readonly p: number;

	/** Maximum exponent. */
	readonly emax: number;
};

/** Minimum exponent for the format: `emin = 1 - emax`. */
export function ieeeEMin(params: IeeeFormat): number {
	return 1 - params.emax;
}

// =============================================================================
// Binary interchange formats
// =============================================================================

/** IEEE 754 binary16 ("half precision"). `k=16`, `p=11`, `emax=15`. */
export const IEEE_FORMAT_BINARY16 = Object.freeze<IeeeFormat>({
	k: 16,
	p: 11,
	emax: 15,
});

/** IEEE 754 binary32 ("single precision"). `k=32`, `p=24`, `emax=127`. */
export const IEEE_FORMAT_BINARY32 = Object.freeze<IeeeFormat>({
	k: 32,
	p: 24,
	emax: 127,
});

/** IEEE 754 binary64 ("double precision"). `k=64`, `p=53`, `emax=1023`. */
export const IEEE_FORMAT_BINARY64 = Object.freeze<IeeeFormat>({
	k: 64,
	p: 53,
	emax: 1023,
});

/** IEEE 754 binary128 ("quadruple precision"). `k=128`, `p=113`, `emax=16383`. */
export const IEEE_FORMAT_BINARY128 = Object.freeze<IeeeFormat>({
	k: 128,
	p: 113,
	emax: 16383,
});

// =============================================================================
// Decimal interchange formats
// =============================================================================

/** IEEE 754 decimal32. `k=32`, `p=7`, `emax=96`. */
export const IEEE_FORMAT_DECIMAL32 = Object.freeze<IeeeFormat>({
	k: 32,
	p: 7,
	emax: 96,
});

/** IEEE 754 decimal64. `k=64`, `p=16`, `emax=384`. */
export const IEEE_FORMAT_DECIMAL64 = Object.freeze<IeeeFormat>({
	k: 64,
	p: 16,
	emax: 384,
});

/** IEEE 754 decimal128. `k=128`, `p=34`, `emax=6144`. */
export const IEEE_FORMAT_DECIMAL128 = Object.freeze<IeeeFormat>({
	k: 128,
	p: 34,
	emax: 6144,
});
