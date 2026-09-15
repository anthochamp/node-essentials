/**
 * CSPRNG byte generation.
 *
 * A single synchronous kernel, unlike the rest of `crypto-*`:
 * `crypto.getRandomValues` (unlike `crypto.subtle`) has always been a
 * synchronous Web API, by design, in every engine that implements it — there is
 * no async variant to unify against, so `MaybePromiseLike<T>` is not used here
 * either, for the same reason `@ac-kit/crypto-safe` does not use it.
 */

const MAX_BYTES_PER_CALL = 65_536;

/**
 * Fills and returns a new `Uint8Array` of `length` cryptographically random
 * bytes, via `crypto.getRandomValues`.
 *
 * Chunks internally at {@link MAX_BYTES_PER_CALL}: the Web Crypto API spec caps
 * a single `getRandomValues` call at 65,536 bytes and throws
 * `QuotaExceededError` beyond it — a limit callers should not have to know
 * about.
 *
 * @throws {RangeError} When `length` is not a non-negative integer.
 */
export function getRandomBytes(length: number): Uint8Array<ArrayBuffer> {
	if (!Number.isInteger(length) || length < 0) {
		throw new RangeError(
			"getRandomBytes: length must be a non-negative integer",
		);
	}

	const bytes = new Uint8Array(length);

	for (let offset = 0; offset < length; offset += MAX_BYTES_PER_CALL) {
		const end = Math.min(offset + MAX_BYTES_PER_CALL, length);

		crypto.getRandomValues(bytes.subarray(offset, end));
	}

	return bytes;
}
