import { describe, expect, it } from "vitest";

import { XXH3_VECTORS } from "./__fixtures__/xxh3-vectors.js";
import { xxh3_128 } from "./xxh3_128.js";

function bytesFor(len: number): Uint8Array {
	const data = new Uint8Array(len);

	for (let i = 0; i < len; i++) {
		data[i] = i % 256;
	}

	return data;
}

describe("xxh3_128", () => {
	// Independently generated with hash-wasm's XXH3 implementation, not this
	// package's own output. Canonical form is high64 then low64, big-endian.
	for (const vector of XXH3_VECTORS) {
		it(`matches len=${vector.len} seed=${vector.seed}`, () => {
			const data = bytesFor(vector.len);
			const digest = xxh3_128(data, BigInt(vector.seed));
			const low = digest.slice(0, 8).reverse();
			const high = digest.slice(8, 16).reverse();

			expect(high.toHex() + low.toHex()).toBe(vector.h128);
		});
	}
});
