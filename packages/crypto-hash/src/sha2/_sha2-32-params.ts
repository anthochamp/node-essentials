/**
 * Structural parameters that fully describe a 32-bit-word Merkle–Damgård SHA-2
 * variant (FIPS 180-4) — SHA-224 and SHA-256 share one compression function
 * ({@link sha2_32ProcessBlock}) and differ only in these two fields.
 */
export type Sha2_32Parameters = {
	/** FIPS 180-4 §5.3.2 (SHA-256) / §5.3.3 (SHA-224) initial hash value. */
	readonly iv: readonly [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	];
	/**
	 * How many bytes of the 32-byte state the digest keeps — 32 for SHA-256, 28
	 * for SHA-224 (FIPS 180-4 §6.3.2 step 7: the 8th word is computed but not
	 * output).
	 */
	readonly outputBytes: number;
};

export const SHA224_PARAMS: Sha2_32Parameters = {
	iv: [
		0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511,
		0x64f98fa7, 0xbefa4fa4,
	],
	outputBytes: 28,
};

export const SHA256_PARAMS: Sha2_32Parameters = {
	iv: [
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
		0x1f83d9ab, 0x5be0cd19,
	],
	outputBytes: 32,
};
