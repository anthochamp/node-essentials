/**
 * Structural parameters that fully describe a 64-bit-word Merkle–Damgård SHA-2
 * variant (FIPS 180-4) — SHA-384 and SHA-512 share one compression function
 * ({@link sha2_64ProcessBlock}) and differ only in these two fields.
 */
export type Sha2_64Parameters = {
	/** FIPS 180-4 §5.3.4 (SHA-384) / §5.3.5 (SHA-512) initial hash value. */
	readonly iv: readonly [
		bigint,
		bigint,
		bigint,
		bigint,
		bigint,
		bigint,
		bigint,
		bigint,
	];
	/**
	 * How many bytes of the 64-byte state the digest keeps — 64 for SHA-512, 48
	 * for SHA-384 (FIPS 180-4 §6.5: the last 2 words are computed but not
	 * output).
	 */
	readonly outputBytes: number;
};

export const SHA384_PARAMS: Sha2_64Parameters = {
	iv: [
		0xcbbb9d5dc1059ed8n,
		0x629a292a367cd507n,
		0x9159015a3070dd17n,
		0x152fecd8f70e5939n,
		0x67332667ffc00b31n,
		0x8eb44a8768581511n,
		0xdb0c2e0d64f98fa7n,
		0x47b5481dbefa4fa4n,
	],
	outputBytes: 48,
};

export const SHA512_PARAMS: Sha2_64Parameters = {
	iv: [
		0x6a09e667f3bcc908n,
		0xbb67ae8584caa73bn,
		0x3c6ef372fe94f82bn,
		0xa54ff53a5f1d36f1n,
		0x510e527fade682d1n,
		0x9b05688c2b3e6c1fn,
		0x1f83d9abfb41bd6bn,
		0x5be0cd19137e2179n,
	],
	outputBytes: 64,
};
