import { concatBytes } from "@ac-kit/core";
import { constantTimeBytesIsEqual } from "@ac-kit/crypto-safe";

/**
 * HMAC (RFC 2104 / FIPS 198-1): a keyed-hash message authentication code built
 * from any hash function and its compression function's block size — both
 * supplied explicitly by the caller (e.g. `hmac(sha256Ts, 64, key, message)`),
 * matching every other block-size-parametrized primitive in `crypto/hash`
 * (`merkleDamgardPad`) rather than a hash-algorithm registry; the caller owns
 * algorithm specificities.
 *
 * @param hash A one-shot, synchronous hash function — the TS kernel of
 *   whichever algorithm the caller has chosen (e.g. `sha256Ts`), never the
 *   Web-Crypto-preferring dual kernel, since that one's `Promise`-returning
 *   shape doesn't fit HMAC's handful of nested synchronous calls.
 * @param blockSizeBytes `hash`'s compression function's block size — 64 for
 *   MD5/SHA-1/SHA-224/SHA-256, 128 for SHA-384/SHA-512.
 * @param tagLengthBytes Truncates the returned tag to this many bytes (RFC 2104
 *   §5). Defaults to the full untruncated output.
 */
export function hmac<THashReturnArrayBuffer extends ArrayBufferLike>(
	hash: (data: Uint8Array) => Uint8Array<THashReturnArrayBuffer>,
	blockSizeBytes: number,
	key: Uint8Array,
	message: Uint8Array,
	tagLengthBytes?: number,
): Uint8Array<THashReturnArrayBuffer> {
	const blockSizedKey = deriveBlockSizedKey_(hash, blockSizeBytes, key);

	const ipad = new Uint8Array(blockSizeBytes);
	const opad = new Uint8Array(blockSizeBytes);

	for (let index = 0; index < blockSizeBytes; index++) {
		const keyByte = blockSizedKey[index]!;
		ipad[index] = keyByte ^ 0x36;
		opad[index] = keyByte ^ 0x5c;
	}

	const innerDigest = hash(concatBytes(ipad, message));
	const tag = hash(concatBytes(opad, innerDigest));

	return tagLengthBytes === undefined ? tag : tag.subarray(0, tagLengthBytes);
}

/**
 * Verifies `tag` against a freshly computed HMAC, comparing in constant time
 * via `@ac-kit/crypto-safe`'s `constantTimeBytesIsEqual`. Unlike
 * `constantTimeBytesIsEqual` itself — which throws on a length mismatch, since
 * its own callers always know the expected length in advance — a length
 * mismatch here is ordinary invalid input (the tag is attacker-controlled at
 * this boundary, e.g. a modified or truncated tag from a Wycheproof `"invalid"`
 * test vector) and simply fails verification rather than throwing.
 */
export function hmacVerify(
	hash: (data: Uint8Array) => Uint8Array,
	blockSizeBytes: number,
	key: Uint8Array,
	message: Uint8Array,
	tag: Uint8Array,
): boolean {
	const expected = hmac(hash, blockSizeBytes, key, message, tag.length);

	return (
		expected.length === tag.length && constantTimeBytesIsEqual(expected, tag)
	);
}

/**
 * FIPS 198-1 §4: keys longer than the block size are shortened by hashing them
 * first; keys shorter than the block size are zero-padded on the right. A key
 * already exactly `blockSizeBytes` long needs neither step.
 */
function deriveBlockSizedKey_(
	hash: (data: Uint8Array) => Uint8Array,
	blockSizeBytes: number,
	key: Uint8Array,
): Uint8Array {
	const baseKey = key.length > blockSizeBytes ? hash(key) : key;

	if (baseKey.length === blockSizeBytes) {
		return baseKey;
	}

	const blockSizedKey = new Uint8Array(blockSizeBytes);
	blockSizedKey.set(baseKey);

	return blockSizedKey;
}
