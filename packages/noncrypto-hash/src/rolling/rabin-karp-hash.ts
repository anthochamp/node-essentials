import { bigIntModPow } from "@ac-kit/math-integer";

import type { IRollingHash } from "./rolling-hash.js";

// A large prime modulus and a base prime larger than the byte alphabet
// (0-255) — the standard polynomial-hashing convention for arbitrary byte
// data, per cp-algorithms.com's widely used "String Hashing" reference
// (https://cp-algorithms.com/string/string-hashing.html): a prime base
// roughly the alphabet size, and a large prime modulus (that article uses
// p=31/m=1e9+9 for lowercase letters; 257 is the smallest prime above 256,
// the byte alphabet this package operates over).
const DEFAULT_BASE = 257n;
const DEFAULT_MODULUS = 1_000_000_009n;

export type RabinKarpHashOptions = {
	/** The base prime, defaulting to {@link DEFAULT_BASE}. */
	readonly base?: bigint;

	/** The modulus prime, defaulting to {@link DEFAULT_MODULUS}. */
	readonly modulus?: bigint;
};

/**
 * Rabin-Karp's "standard polynomial" rolling hash: ordinary modular integer
 * arithmetic (unlike {@link RabinFingerprint}'s GF(2) polynomial division) —
 * `hash = (hash * base + byteIn) mod modulus`, i.e. the sliding-window
 * recurrence from Wikipedia's "Rolling hash" article's "Polynomial rolling
 * hash" section (first byte carries the highest power of `base`), with the
 * departing byte's contribution (`byteOut * base^(windowSize - 1) mod modulus`)
 * subtracted out first. The high-order term is precomputed once at construction
 * via `bigIntModPow`, since `windowSize` is fixed per instance.
 */
export class RabinKarpHash implements IRollingHash<bigint> {
	readonly windowSize: number;

	private readonly base_: bigint;
	private readonly modulus_: bigint;
	private readonly highOrderTerm_: bigint;
	private readonly ring_: Uint8Array;
	private ringIndex_ = 0;
	private filled_ = 0;
	private value_ = 0n;

	constructor(windowSize: number, options?: RabinKarpHashOptions) {
		if (!Number.isInteger(windowSize) || windowSize < 1) {
			throw new RangeError("windowSize must be a positive integer");
		}

		this.windowSize = windowSize;
		this.base_ = options?.base ?? DEFAULT_BASE;
		this.modulus_ = options?.modulus ?? DEFAULT_MODULUS;
		this.highOrderTerm_ = bigIntModPow(
			this.base_,
			BigInt(windowSize - 1),
			this.modulus_,
		);
		this.ring_ = new Uint8Array(windowSize);
	}

	get value(): bigint {
		return this.value_;
	}

	push(byteIn: number): bigint {
		const byte = byteIn & 0xff;
		let next = this.value_;

		if (this.filled_ === this.windowSize) {
			const byteOut = BigInt(this.ring_[this.ringIndex_]!);
			const departingTerm = (byteOut * this.highOrderTerm_) % this.modulus_;

			next = (next - departingTerm + this.modulus_) % this.modulus_;
		} else {
			this.filled_++;
		}

		this.value_ = (next * this.base_ + BigInt(byte)) % this.modulus_;
		this.ring_[this.ringIndex_] = byte;
		this.ringIndex_ = (this.ringIndex_ + 1) % this.windowSize;

		return this.value_;
	}
}
