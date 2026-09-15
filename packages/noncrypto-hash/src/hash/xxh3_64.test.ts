import { describe, expect, it } from "vitest";

import { XXH3_VECTORS } from "./__fixtures__/xxh3-vectors.js";
import { xxh3_64 } from "./xxh3_64.js";

function bytesFor(len: number): Uint8Array {
	const data = new Uint8Array(len);

	for (let i = 0; i < len; i++) {
		data[i] = i % 256;
	}

	return data;
}

describe("xxh3_64", () => {
	// Independently generated with hash-wasm's XXH3 implementation, not this
	// package's own output.
	for (const vector of XXH3_VECTORS) {
		it(`matches len=${vector.len} seed=${vector.seed}`, () => {
			const data = bytesFor(vector.len);

			expect(xxh3_64(data, BigInt(vector.seed))).toBe(
				BigInt(`0x${vector.h64}`),
			);
		});
	}
});
