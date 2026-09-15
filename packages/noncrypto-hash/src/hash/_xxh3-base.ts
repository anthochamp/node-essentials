import {
	byteSwap32,
	byteSwap64,
	getBigUint64Le,
	getUint32Le,
	mask64,
	MASK_32N,
	mulWide64,
	rotl32,
	rotl64,
	setBigUint64Le,
	xorshift64,
} from "@ac-kit/core";

const PRIME32_1 = 0x9e3779b1n;
const PRIME32_2 = 0x85ebca77n;
const PRIME32_3 = 0xc2b2ae3dn;
const PRIME64_1 = 0x9e3779b185ebca87n;
const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
const PRIME64_3 = 0x165667b19e3779f9n;
const PRIME64_4 = 0x85ebca77c2b2ae63n;
const PRIME64_5 = 0x27d4eb2f165667c5n;
const PRIME_MX1 = 0x165667919e3779f9n;
const PRIME_MX2 = 0x9fb21c651e98df25n;

const XXH_STRIPE_LEN = 64;
const XXH_SECRET_CONSUME_RATE = 8;
const XXH_SECRET_LASTACC_START = 7;
const XXH_SECRET_MERGEACCS_START = 11;
const XXH3_SECRET_SIZE_MIN = 136;
const XXH3_MIDSIZE_STARTOFFSET = 3;
const XXH3_MIDSIZE_LASTOFFSET = 17;

// Pseudorandom secret taken directly from FARSH, per the xxHash reference implementation.
// Ignored format: byte table, one row per source line for easy diffing against the C source
// oxfmt-ignore
const DEFAULT_SECRET = new Uint8Array([
	0xb8, 0xfe, 0x6c, 0x39, 0x23, 0xa4, 0x4b, 0xbe, 0x7c, 0x01, 0x81, 0x2c, 0xf7, 0x21, 0xad, 0x1c,
	0xde, 0xd4, 0x6d, 0xe9, 0x83, 0x90, 0x97, 0xdb, 0x72, 0x40, 0xa4, 0xa4, 0xb7, 0xb3, 0x67, 0x1f,
	0xcb, 0x79, 0xe6, 0x4e, 0xcc, 0xc0, 0xe5, 0x78, 0x82, 0x5a, 0xd0, 0x7d, 0xcc, 0xff, 0x72, 0x21,
	0xb8, 0x08, 0x46, 0x74, 0xf7, 0x43, 0x24, 0x8e, 0xe0, 0x35, 0x90, 0xe6, 0x81, 0x3a, 0x26, 0x4c,
	0x3c, 0x28, 0x52, 0xbb, 0x91, 0xc3, 0x00, 0xcb, 0x88, 0xd0, 0x65, 0x8b, 0x1b, 0x53, 0x2e, 0xa3,
	0x71, 0x64, 0x48, 0x97, 0xa2, 0x0d, 0xf9, 0x4e, 0x38, 0x19, 0xef, 0x46, 0xa9, 0xde, 0xac, 0xd8,
	0xa8, 0xfa, 0x76, 0x3f, 0xe3, 0x9c, 0x34, 0x3f, 0xf9, 0xdc, 0xbb, 0xc7, 0xc7, 0x0b, 0x4f, 0x1d,
	0x8a, 0x51, 0xe0, 0x4b, 0xcd, 0xb4, 0x59, 0x31, 0xc8, 0x9f, 0x7e, 0xc9, 0xd9, 0x78, 0x73, 0x64,
	0xea, 0xc5, 0xac, 0x83, 0x34, 0xd3, 0xeb, 0xc3, 0xc5, 0x81, 0xa0, 0xff, 0xfa, 0x13, 0x63, 0xeb,
	0x17, 0x0d, 0xdd, 0x51, 0xb7, 0xf0, 0xda, 0x49, 0xd3, 0x16, 0x55, 0x26, 0x29, 0xd4, 0x68, 0x9e,
	0x2b, 0x16, 0xbe, 0x58, 0x7d, 0x47, 0xa1, 0xfc, 0x8f, 0xf8, 0xb8, 0xd1, 0x7a, 0xd0, 0x31, 0xce,
	0x45, 0xcb, 0x3a, 0x8f, 0x95, 0x16, 0x04, 0x28, 0xaf, 0xd7, 0xfb, 0xca, 0xbb, 0x4b, 0x40, 0x7e,
]);

const INIT_ACC = BigUint64Array.from([
	PRIME32_3,
	PRIME64_1,
	PRIME64_2,
	PRIME64_3,
	PRIME64_4,
	PRIME32_2,
	PRIME64_5,
	PRIME32_1,
]);

function mulFold64_(lhs: bigint, rhs: bigint): bigint {
	const { low, high } = mulWide64(lhs, rhs);

	return low ^ high;
}

/** The fast avalanche, for input already partially mixed. */
function avalanche_(value: bigint): bigint {
	let h = xorshift64(value, 37n);

	h = mask64(h * PRIME_MX1);
	h = xorshift64(h, 32n);

	return h;
}

/** XXH64's own (stronger) avalanche, for input not yet mixed. */
function avalancheXXH64_(value: bigint): bigint {
	let h = value;

	h = xorshift64(h, 33n);
	h = mask64(h * PRIME64_2);
	h = xorshift64(h, 29n);
	h = mask64(h * PRIME64_3);
	h = xorshift64(h, 32n);

	return h;
}

/** Pelle Evensen's rrmxmx — stronger than {@link avalanche_}, at extra cost. */
function rrmxmx_(value: bigint, len: bigint): bigint {
	let h = value ^ (rotl64(value, 49n) ^ rotl64(value, 24n));

	h = mask64(h * PRIME_MX2);
	h = mask64(h ^ ((h >> 35n) + len));
	h = mask64(h * PRIME_MX2);

	return xorshift64(h, 28n);
}

function combined1to3_(input: Uint8Array, len: number): number {
	const c1 = input[0]!;
	const c2 = input[len >> 1]!;
	const c3 = input[len - 1]!;

	return ((c1 << 16) | (c2 << 24) | c3 | (len << 8)) >>> 0;
}

function xxh3Len1to3_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	const combined = combined1to3_(input, len);
	const bitflip = mask64(
		(BigInt(getUint32Le(secret, 0)) ^ BigInt(getUint32Le(secret, 4))) + seed,
	);
	const keyed = mask64(BigInt(combined) ^ bitflip);

	return avalancheXXH64_(keyed);
}

function modifiedSeed4to8_(seed: bigint): bigint {
	const low32 = Number(seed & MASK_32N);

	return mask64(seed ^ (BigInt(byteSwap32(low32)) << 32n));
}

function xxh3Len4to8_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	const seedMod = modifiedSeed4to8_(seed);
	const input1 = BigInt(getUint32Le(input, 0));
	const input2 = BigInt(getUint32Le(input, len - 4));
	const bitflip = mask64(
		(getBigUint64Le(secret, 8) ^ getBigUint64Le(secret, 16)) - seedMod,
	);
	const input64 = mask64(input2 + (input1 << 32n));
	const keyed = mask64(input64 ^ bitflip);

	return rrmxmx_(keyed, BigInt(len));
}

function xxh3Len9to16_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	const bitflip1 = mask64(
		(getBigUint64Le(secret, 24) ^ getBigUint64Le(secret, 32)) + seed,
	);
	const bitflip2 = mask64(
		(getBigUint64Le(secret, 40) ^ getBigUint64Le(secret, 48)) - seed,
	);
	const inputLo = mask64(getBigUint64Le(input, 0) ^ bitflip1);
	const inputHi = mask64(getBigUint64Le(input, len - 8) ^ bitflip2);
	const acc = mask64(
		BigInt(len) +
			mask64(byteSwap64(inputLo)) +
			inputHi +
			mulFold64_(inputLo, inputHi),
	);

	return avalanche_(acc);
}

function xxh3Len0to16_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	if (len > 8) {
		return xxh3Len9to16_64_(input, len, secret, seed);
	}

	if (len >= 4) {
		return xxh3Len4to8_64_(input, len, secret, seed);
	}

	if (len > 0) {
		return xxh3Len1to3_64_(input, len, secret, seed);
	}

	return avalancheXXH64_(
		mask64(seed ^ (getBigUint64Le(secret, 56) ^ getBigUint64Le(secret, 64))),
	);
}

function mix16B_(
	input: Uint8Array,
	inputOffset: number,
	secret: Uint8Array,
	secretOffset: number,
	seed: bigint,
): bigint {
	const inputLo = getBigUint64Le(input, inputOffset);
	const inputHi = getBigUint64Le(input, inputOffset + 8);

	return mulFold64_(
		mask64(inputLo ^ mask64(getBigUint64Le(secret, secretOffset) + seed)),
		mask64(inputHi ^ mask64(getBigUint64Le(secret, secretOffset + 8) - seed)),
	);
}

function xxh3Len17to128_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	let acc = mask64(BigInt(len) * PRIME64_1);
	const lastRound = Math.floor((len - 1) / 32);

	for (let i = lastRound; i >= 0; i--) {
		acc = mask64(acc + mix16B_(input, 16 * i, secret, 32 * i, seed));
		acc = mask64(
			acc + mix16B_(input, len - 16 * (i + 1), secret, 32 * i + 16, seed),
		);
	}

	return avalanche_(acc);
}

function xxh3Len129to240_64_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): bigint {
	let acc = mask64(BigInt(len) * PRIME64_1);
	const nbRounds = Math.floor(len / 16);

	for (let i = 0; i < 8; i++) {
		acc = mask64(acc + mix16B_(input, 16 * i, secret, 16 * i, seed));
	}

	let accEnd = mix16B_(
		input,
		len - 16,
		secret,
		XXH3_SECRET_SIZE_MIN - XXH3_MIDSIZE_LASTOFFSET,
		seed,
	);

	acc = avalanche_(acc);

	for (let i = 8; i < nbRounds; i++) {
		accEnd = mask64(
			accEnd +
				mix16B_(
					input,
					16 * i,
					secret,
					16 * (i - 8) + XXH3_MIDSIZE_STARTOFFSET,
					seed,
				),
		);
	}

	return avalanche_(mask64(acc + accEnd));
}

function accumulate512_(
	acc: BigUint64Array,
	input: Uint8Array,
	inputOffset: number,
	secret: Uint8Array,
	secretOffset: number,
): void {
	for (let lane = 0; lane < 8; lane++) {
		const dataVal = getBigUint64Le(input, inputOffset + lane * 8);
		const dataKey = mask64(
			dataVal ^ getBigUint64Le(secret, secretOffset + lane * 8),
		);

		acc[lane ^ 1] = mask64(acc[lane ^ 1]! + dataVal);
		acc[lane] = mask64(acc[lane]! + (dataKey & MASK_32N) * (dataKey >> 32n));
	}
}

function accumulateStripes_(
	acc: BigUint64Array,
	input: Uint8Array,
	inputOffset: number,
	secret: Uint8Array,
	secretOffset: number,
	nbStripes: number,
): void {
	for (let n = 0; n < nbStripes; n++) {
		accumulate512_(
			acc,
			input,
			inputOffset + n * XXH_STRIPE_LEN,
			secret,
			secretOffset + n * XXH_SECRET_CONSUME_RATE,
		);
	}
}

function scrambleAcc_(
	acc: BigUint64Array,
	secret: Uint8Array,
	secretOffset: number,
): void {
	for (let lane = 0; lane < 8; lane++) {
		let value = acc[lane]!;

		value = xorshift64(value, 47n);
		value = mask64(value ^ getBigUint64Le(secret, secretOffset + lane * 8));
		value = mask64(value * PRIME32_1);
		acc[lane] = value;
	}
}

function initCustomSecret_(seed: bigint): Uint8Array {
	const out = new Uint8Array(DEFAULT_SECRET.length);

	for (let i = 0; i < DEFAULT_SECRET.length / 16; i++) {
		const lo = mask64(getBigUint64Le(DEFAULT_SECRET, 16 * i) + seed);
		const hi = mask64(getBigUint64Le(DEFAULT_SECRET, 16 * i + 8) - seed);

		setBigUint64Le(out, 16 * i, lo);
		setBigUint64Le(out, 16 * i + 8, hi);
	}

	return out;
}

function hashLongInternalLoop_(
	acc: BigUint64Array,
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
): void {
	const secretSize = secret.length;
	const nbStripesPerBlock = Math.floor(
		(secretSize - XXH_STRIPE_LEN) / XXH_SECRET_CONSUME_RATE,
	);
	const blockLen = XXH_STRIPE_LEN * nbStripesPerBlock;
	const nbBlocks = Math.floor((len - 1) / blockLen);

	for (let n = 0; n < nbBlocks; n++) {
		accumulateStripes_(acc, input, n * blockLen, secret, 0, nbStripesPerBlock);
		scrambleAcc_(acc, secret, secretSize - XXH_STRIPE_LEN);
	}

	const nbStripes = Math.floor(
		(len - 1 - blockLen * nbBlocks) / XXH_STRIPE_LEN,
	);

	accumulateStripes_(acc, input, nbBlocks * blockLen, secret, 0, nbStripes);
	accumulate512_(
		acc,
		input,
		len - XXH_STRIPE_LEN,
		secret,
		secretSize - XXH_STRIPE_LEN - XXH_SECRET_LASTACC_START,
	);
}

function mix2Accs_(
	acc: BigUint64Array,
	index: number,
	secret: Uint8Array,
	secretOffset: number,
): bigint {
	return mulFold64_(
		mask64(acc[index]! ^ getBigUint64Le(secret, secretOffset)),
		mask64(acc[index + 1]! ^ getBigUint64Le(secret, secretOffset + 8)),
	);
}

function mergeAccs_(
	acc: BigUint64Array,
	secret: Uint8Array,
	secretOffset: number,
	start: bigint,
): bigint {
	let result = start;

	for (let i = 0; i < 4; i++) {
		result = mask64(
			result + mix2Accs_(acc, 2 * i, secret, secretOffset + 16 * i),
		);
	}

	return avalanche_(result);
}

function finalizeLong64_(
	acc: BigUint64Array,
	secret: Uint8Array,
	len: number,
): bigint {
	return mergeAccs_(
		acc,
		secret,
		XXH_SECRET_MERGEACCS_START,
		mask64(BigInt(len) * PRIME64_1),
	);
}

function hashLong64_(input: Uint8Array, len: number, seed: bigint): bigint {
	const secret = seed === 0n ? DEFAULT_SECRET : initCustomSecret_(seed);
	const acc = BigUint64Array.from(INIT_ACC);

	hashLongInternalLoop_(acc, input, len, secret);

	return finalizeLong64_(acc, secret, len);
}

/** Computes the XXH3-64 hash of `data`. */
export function xxh3Digest64_(data: Uint8Array, seed: bigint): bigint {
	const len = data.length;

	if (len <= 16) {
		return xxh3Len0to16_64_(data, len, DEFAULT_SECRET, seed);
	}

	if (len <= 128) {
		return xxh3Len17to128_64_(data, len, DEFAULT_SECRET, seed);
	}

	if (len <= 240) {
		return xxh3Len129to240_64_(data, len, DEFAULT_SECRET, seed);
	}

	return hashLong64_(data, len, seed);
}

function xxh3Len1to3_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	const combinedLo = combined1to3_(input, len);
	const combinedHi = rotl32(byteSwap32(combinedLo), 13);
	const bitflipLo = mask64(
		(BigInt(getUint32Le(secret, 0)) ^ BigInt(getUint32Le(secret, 4))) + seed,
	);
	const bitflipHi = mask64(
		(BigInt(getUint32Le(secret, 8)) ^ BigInt(getUint32Le(secret, 12))) - seed,
	);
	const keyedLo = mask64(BigInt(combinedLo) ^ bitflipLo);
	const keyedHi = mask64(BigInt(combinedHi) ^ bitflipHi);

	return { low: avalancheXXH64_(keyedLo), high: avalancheXXH64_(keyedHi) };
}

function xxh3Len4to8_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	const seedMod = modifiedSeed4to8_(seed);
	const inputLo = BigInt(getUint32Le(input, 0));
	const inputHi = BigInt(getUint32Le(input, len - 4));
	const input64 = mask64(inputLo + (inputHi << 32n));
	const bitflip = mask64(
		(getBigUint64Le(secret, 16) ^ getBigUint64Le(secret, 24)) + seedMod,
	);
	const keyed = mask64(input64 ^ bitflip);
	const m128 = mulWide64(keyed, mask64(PRIME64_1 + (BigInt(len) << 2n)));

	let high = mask64(m128.high + (m128.low << 1n));
	let low = mask64(m128.low ^ (high >> 3n));

	low = xorshift64(low, 35n);
	low = mask64(low * PRIME_MX2);
	low = xorshift64(low, 28n);
	high = avalanche_(high);

	return { low, high };
}

function xxh3Len9to16_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	const bitflipLo = mask64(
		(getBigUint64Le(secret, 32) ^ getBigUint64Le(secret, 40)) - seed,
	);
	const bitflipHi = mask64(
		(getBigUint64Le(secret, 48) ^ getBigUint64Le(secret, 56)) + seed,
	);
	const inputLo = getBigUint64Le(input, 0);
	let inputHi = getBigUint64Le(input, len - 8);
	const m128 = mulWide64(mask64(inputLo ^ inputHi ^ bitflipLo), PRIME64_1);

	let low = mask64(m128.low + (BigInt(len - 1) << 54n));

	inputHi = mask64(inputHi ^ bitflipHi);

	let high = mask64(
		m128.high +
			(inputHi & 0xffffffff00000000n) +
			(inputHi & MASK_32N) * PRIME32_2,
	);

	low = mask64(low ^ byteSwap64(high));

	const h128 = mulWide64(low, PRIME64_2);

	return {
		low: avalanche_(h128.low),
		high: avalanche_(mask64(h128.high + high * PRIME64_2)),
	};
}

function xxh3Len0to16_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	if (len > 8) {
		return xxh3Len9to16_128_(input, len, secret, seed);
	}

	if (len >= 4) {
		return xxh3Len4to8_128_(input, len, secret, seed);
	}

	if (len > 0) {
		return xxh3Len1to3_128_(input, len, secret, seed);
	}

	const bitflipLo = mask64(
		getBigUint64Le(secret, 64) ^ getBigUint64Le(secret, 72),
	);
	const bitflipHi = mask64(
		getBigUint64Le(secret, 80) ^ getBigUint64Le(secret, 88),
	);

	return {
		low: avalancheXXH64_(mask64(seed ^ bitflipLo)),
		high: avalancheXXH64_(mask64(seed ^ bitflipHi)),
	};
}

function mix32B_(
	acc: { low: bigint; high: bigint },
	input: Uint8Array,
	input1Offset: number,
	input2Offset: number,
	secret: Uint8Array,
	secretOffset: number,
	seed: bigint,
): { low: bigint; high: bigint } {
	let low = mask64(
		acc.low + mix16B_(input, input1Offset, secret, secretOffset, seed),
	);

	low = mask64(
		low ^
			mask64(
				getBigUint64Le(input, input2Offset) +
					getBigUint64Le(input, input2Offset + 8),
			),
	);

	let high = mask64(
		acc.high + mix16B_(input, input2Offset, secret, secretOffset + 16, seed),
	);

	high = mask64(
		high ^
			mask64(
				getBigUint64Le(input, input1Offset) +
					getBigUint64Le(input, input1Offset + 8),
			),
	);

	return { low, high };
}

function xxh3Len17to128_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	let acc = { low: mask64(BigInt(len) * PRIME64_1), high: 0n };
	const lastRound = Math.floor((len - 1) / 32);

	for (let i = lastRound; i >= 0; i--) {
		acc = mix32B_(acc, input, 16 * i, len - 16 * (i + 1), secret, 32 * i, seed);
	}

	const low = avalanche_(mask64(acc.low + acc.high));
	const rawHigh = mask64(
		mask64(acc.low * PRIME64_1) +
			mask64(acc.high * PRIME64_4) +
			mask64(mask64(BigInt(len) - seed) * PRIME64_2),
	);

	return { low, high: mask64(-avalanche_(rawHigh)) };
}

function xxh3Len129to240_128_(
	input: Uint8Array,
	len: number,
	secret: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	let acc = { low: mask64(BigInt(len) * PRIME64_1), high: 0n };

	for (let i = 32; i < 160; i += 32) {
		acc = mix32B_(acc, input, i - 32, i - 16, secret, i - 32, seed);
	}

	acc = { low: avalanche_(acc.low), high: avalanche_(acc.high) };

	for (let i = 160; i <= len; i += 32) {
		acc = mix32B_(
			acc,
			input,
			i - 32,
			i - 16,
			secret,
			XXH3_MIDSIZE_STARTOFFSET + i - 160,
			seed,
		);
	}

	acc = mix32B_(
		acc,
		input,
		len - 16,
		len - 32,
		secret,
		XXH3_SECRET_SIZE_MIN - XXH3_MIDSIZE_LASTOFFSET - 16,
		mask64(-seed),
	);

	const low = avalanche_(mask64(acc.low + acc.high));
	const rawHigh = mask64(
		mask64(acc.low * PRIME64_1) +
			mask64(acc.high * PRIME64_4) +
			mask64(mask64(BigInt(len) - seed) * PRIME64_2),
	);

	return { low, high: mask64(-avalanche_(rawHigh)) };
}

function finalizeLong128_(
	acc: BigUint64Array,
	secret: Uint8Array,
	len: number,
): { low: bigint; high: bigint } {
	const low = finalizeLong64_(acc, secret, len);
	const high = mergeAccs_(
		acc,
		secret,
		secret.length - XXH_STRIPE_LEN - XXH_SECRET_MERGEACCS_START,
		mask64(~mask64(BigInt(len) * PRIME64_2)),
	);

	return { low, high };
}

function hashLong128_(
	input: Uint8Array,
	len: number,
	seed: bigint,
): { low: bigint; high: bigint } {
	const secret = seed === 0n ? DEFAULT_SECRET : initCustomSecret_(seed);
	const acc = BigUint64Array.from(INIT_ACC);

	hashLongInternalLoop_(acc, input, len, secret);

	return finalizeLong128_(acc, secret, len);
}

/** Computes the XXH3-128 hash of `data`. */
export function xxh3Digest128_(
	data: Uint8Array,
	seed: bigint,
): { low: bigint; high: bigint } {
	const len = data.length;

	if (len <= 16) {
		return xxh3Len0to16_128_(data, len, DEFAULT_SECRET, seed);
	}

	if (len <= 128) {
		return xxh3Len17to128_128_(data, len, DEFAULT_SECRET, seed);
	}

	if (len <= 240) {
		return xxh3Len129to240_128_(data, len, DEFAULT_SECRET, seed);
	}

	return hashLong128_(data, len, seed);
}
