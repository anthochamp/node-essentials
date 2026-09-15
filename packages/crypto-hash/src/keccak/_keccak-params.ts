/**
 * Structural parameters that identify a member of the Keccak sponge family
 * (FIPS 202) — SHA3-224/256/384/512 and SHAKE128/256 share one construction
 * ({@link keccakSponge} / {@link KeccakSink}) and differ only in these two
 * fields, plus (for SHAKE) an output length chosen per call/instance rather
 * than fixed by the algorithm — see `shake128.ts`.
 */
export type KeccakParameters = {
	/** The sponge's rate, in bytes (1600 bits minus the security capacity). */
	readonly rateBytes: number;
	/**
	 * The domain-separation suffix bits, already merged with pad10_1's first `1`
	 * bit into one byte: `0x06` for SHA3-_, `0x1f` for SHAKE*.
	 */
	readonly domainSuffix: number;
};

const SHA3_DOMAIN_SUFFIX = 0x06;
const SHAKE_DOMAIN_SUFFIX = 0x1f;

/** SHA3-224's rate: 1600 − 2×224 = 1152 bits = 144 bytes. */
export const SHA3_224_PARAMS: KeccakParameters = {
	rateBytes: 144,
	domainSuffix: SHA3_DOMAIN_SUFFIX,
};

/** SHA3-256's rate: 1600 − 2×256 = 1088 bits = 136 bytes. */
export const SHA3_256_PARAMS: KeccakParameters = {
	rateBytes: 136,
	domainSuffix: SHA3_DOMAIN_SUFFIX,
};

/** SHA3-384's rate: 1600 − 2×384 = 832 bits = 104 bytes. */
export const SHA3_384_PARAMS: KeccakParameters = {
	rateBytes: 104,
	domainSuffix: SHA3_DOMAIN_SUFFIX,
};

/** SHA3-512's rate: 1600 − 2×512 = 576 bits = 72 bytes. */
export const SHA3_512_PARAMS: KeccakParameters = {
	rateBytes: 72,
	domainSuffix: SHA3_DOMAIN_SUFFIX,
};

/** SHAKE128's rate: 1600 − 2×128 = 1344 bits = 168 bytes. */
export const SHAKE128_PARAMS: KeccakParameters = {
	rateBytes: 168,
	domainSuffix: SHAKE_DOMAIN_SUFFIX,
};

/** SHAKE256's rate: 1600 − 2×256 = 1088 bits = 136 bytes — same as SHA3-256's. */
export const SHAKE256_PARAMS: KeccakParameters = {
	rateBytes: 136,
	domainSuffix: SHAKE_DOMAIN_SUFFIX,
};
