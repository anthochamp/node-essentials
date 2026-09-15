import { rotl32 } from "@ac-kit/core";

import type { IRollingHash } from "./rolling-hash.js";

// Buzhash's 256-entry substitution table has no single canonical reference
// across implementations (unlike CRC/xxh3, whose parameters/constants are
// spec- or paper-defined) — Wikipedia's own description of the algorithm
// ("cyclic polynomial hashing") only requires *some* substitution function
// with roughly balanced bit positions, not a specific one. This table is
// this package's own fixed, reproducible choice: 256 values from a
// splitmix32 PRNG seeded with 0x9e3779b9, generated once and frozen here —
// not tied to, or claiming compatibility with, any other Buzhash
// implementation (e.g. borg's, which additionally uses a different,
// non-balanced table by design).
// oxfmt-ignore
const SUBSTITUTION_TABLE = new Uint32Array([
	0xd9c0799c, 0xaf362e10, 0x7fa88912, 0xc4671b39, 0xf1d2eee4, 0x867a4029,	0xa3772475, 0xee3e862c,
	0x88cc3672, 0x2de4afb5, 0x7e785fa2, 0x991e27d9,	0x8051c7f4, 0xb0c40637, 0xef6cfcab, 0xaa9816a0,
	0xbca2a091, 0xa60e7ff2,	0x511a119c, 0x5a3ab2d1, 0x39ecfb7c, 0x77ece360, 0xe25f65ce, 0xf6abb0b7,
	0x323e4fb2, 0xb7d452d7, 0x0d38dc18, 0xdebd2e34, 0xd4e554d8, 0x56c231bd,	0x57d5d6ba, 0x19aabdd5,
	0xf65481c7, 0xea2ef160, 0xf888a14f, 0x82f22d16,	0x08dc760d, 0xa23fa149, 0xf12692e0, 0x1e9341fa,
	0xe7ae2556, 0x01fdfeef,	0x2e7ba0fc, 0x3102977d, 0x967913e9, 0xf518453a, 0x091e906e, 0x6bb83586,
	0x1fabf94c, 0xf1e75379, 0x3304e33a, 0x31219540, 0x218752a7, 0x40c6e8af,	0x8dcaa1fe, 0x5d221c3b,
	0x81e93230, 0x9ac33529, 0xdc232899, 0x85486079,	0x0ce70247, 0x1ca6c89e, 0xc7956e54, 0xc2207eb2,
	0x05cc990f, 0xf0e69f7f,	0xecab038f, 0x31bd4ff6, 0x7d1dcfa1, 0x00bda0a5, 0xbf9bb164, 0xd50dbef6,
	0x58de31fa, 0x4ecd447d, 0x8513f724, 0xd315faae, 0xa6021dc7, 0x41d0688c,	0xabf8a1e1, 0xa803ae15,
	0x3d2683f5, 0xff1e4b4b, 0x59bd43c1, 0x96c32b63,	0x52318fc8, 0x786bdf62, 0x77d73425, 0x00353c68,
	0x7de3f10b, 0x88b0bfef,	0x4f1f7968, 0x87144479, 0x5d8d30b2, 0xa61869aa, 0x01dc1115, 0x69b77c19,
	0xa5f8b876, 0x07ab1b81, 0xbc1914ed, 0x6e353bd7, 0xca7bb705, 0x5b71a23a,	0x2cd16df5, 0xc2cc9c17,
	0x93793d24, 0x261241dc, 0x2227a568, 0x8e60f66d,	0x3a3ead2a, 0x73764d58, 0xef893b8d, 0x53a3d83a,
	0x2d9f21ad, 0xf1194fd5,	0x9b9394e2, 0x6b946018, 0xa8df7f4d, 0x12b295ba, 0x4b0ef0b0, 0x14a13cdc,
	0x228fb6e4, 0xabf92974, 0xe857b405, 0x47f9d726, 0x2ebdd146, 0xa9b608ad,	0xe39cc06e, 0xb594af1c,
	0x722d4385, 0x447ff65c, 0x3619bc81, 0xad658c54,	0xf125b317, 0x2af87709, 0xa7dcacf0, 0xf0f30379,
	0x5fc1893d, 0xee03968e,	0x6d9443e4, 0x3d91730b, 0x08523e26, 0xfe231a0f, 0x2407d4ad, 0x84e561a3,
	0x881c3207, 0x090af1f1, 0x68680255, 0x3b783c74, 0xf7c12060, 0x9d604d63,	0x0f7d22e9, 0x9d9a61a7,
	0x84b5958d, 0xc0ccd6b9, 0x1a8ee404, 0x11085a16,	0x25b36ebf, 0xc9f126ca, 0xcb4f8f27, 0xbe7c8314,
	0xfc549c43, 0xb765a95c,	0x284b4e81, 0xded2ec86, 0xccc601f0, 0x18f3990d, 0x12ef4104, 0x6ee739d7,
	0x667c34f1, 0x8419b239, 0xe2500a53, 0xa905e7b7, 0xdac55ca7, 0x2847e1e7,	0xf61c7ac9, 0xa9c5c8f1,
	0x5b98cf34, 0xce9d7e9b, 0x8e998f78, 0x3542c2f4,	0xdfea3578, 0x128dee22, 0x5e8f560a, 0xb940b80c,
	0x69584617, 0xfb3a2c6e,	0x08ed6164, 0x108cfaa7, 0x6a6cd585, 0x0e0a1677, 0xe0f74872, 0x7e81d664,
	0x3235ec8d, 0x2d574067, 0x6307ce27, 0xed231ad2, 0x0f563702, 0xf6e4ed81,	0x56285078, 0xac03e845,
	0x4fc56284, 0x6120f7d8, 0xf023a7a6, 0xb4ba0c88,	0x814346a6, 0x9dc31545, 0xfe759446, 0x12238b58,
	0x870e6fe7, 0x6b70e6e8,	0x15181471, 0x235a8392, 0x82f8ff87, 0x93fc27bb, 0xc29517cd, 0x7d0e946c,
	0x410d520b, 0x76cad54a, 0x08a4ed66, 0x0c4b652b, 0xe96e2c6b, 0x65ac0aec,	0xf73c18b4, 0x8d331b6e,
	0xc533afbc, 0xcec4a5af, 0x29c77133, 0x1d3a3647,	0x36d8e35d, 0x788b642e, 0x16d448fc, 0xd53453f1,
	0xf2a2a1f9, 0xadd626c8,	0xb3d4adf7, 0xe74be42d, 0x89f917be, 0xe49f4b82, 0x961de161, 0xc2652824,
	0x4ef845f5, 0xbe13351e, 0xa04ca76d, 0xdf4b7988, 0x57f052e9, 0x4eaa5929,	0xe8723726, 0x3072fdfe,
	0x5e7a63ca, 0x6af3d53e, 0xe93d4f21, 0x91a051fb,	0xc6c9688c, 0x0d11923d, 0x51a665a7, 0xdfa0f5a2,
]);

/**
 * Buzhash / cyclic-polynomial rolling hash (Cohen 1997): each byte contributes
 * `SUBSTITUTION_TABLE[byte]`, rotated left by its distance from the front of a
 * fixed-size window; sliding the window rotates the whole accumulator left by
 * one and XORs in the new byte's contribution while XORing out the departing
 * byte's (pre-rotated by `windowSize` positions, so removal costs one table
 * lookup, not a runtime rotate).
 */
export class Buzhash implements IRollingHash<number> {
	readonly windowSize: number;

	private value_ = 0;
	private readonly ring_: Uint8Array;
	private ringIndex_ = 0;
	private filled_ = 0;
	private readonly removalTable_: Uint32Array;

	constructor(windowSize: number) {
		if (!Number.isInteger(windowSize) || windowSize < 1) {
			throw new RangeError("windowSize must be a positive integer");
		}

		this.windowSize = windowSize;
		this.ring_ = new Uint8Array(windowSize);
		this.removalTable_ = new Uint32Array(256);

		const rotateAmount = windowSize % 32;

		for (let byte = 0; byte < 256; byte++) {
			this.removalTable_[byte] = rotl32(
				SUBSTITUTION_TABLE[byte]!,
				rotateAmount,
			);
		}
	}

	get value(): number {
		return this.value_;
	}

	push(byteIn: number): number {
		const byte = byteIn & 0xff;
		let next = rotl32(this.value_, 1) ^ SUBSTITUTION_TABLE[byte]!;

		if (this.filled_ === this.windowSize) {
			const byteOut = this.ring_[this.ringIndex_]!;

			next ^= this.removalTable_[byteOut]!;
		} else {
			this.filled_++;
		}

		this.ring_[this.ringIndex_] = byte;
		this.ringIndex_ = (this.ringIndex_ + 1) % this.windowSize;
		this.value_ = next >>> 0;

		return this.value_;
	}
}
