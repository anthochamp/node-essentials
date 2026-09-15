import { sha256Ts } from "@ac-kit/crypto-hash";

/**
 * @throws {Error} When `data`'s SHA-256 does not match `expectedSha256` — an
 *   unverified download is a supply-chain hole, never tolerated silently.
 */
export function verifyChecksum(
	data: Uint8Array,
	expectedSha256: string,
	source: string,
): void {
	const actual = sha256Ts(data).toHex();

	if (actual !== expectedSha256) {
		throw new Error(
			`checksum mismatch for ${source}: expected ${expectedSha256}, got ${actual}`,
		);
	}
}
