import {
	buildGf2PolynomialTable,
	stepGf2Polynomial,
} from "../_gf2-polynomial.js";
import type { IRollingHash } from "./rolling-hash.js";

export type RabinFingerprintOptions = {
	/** The register width in bits, defaulting to {@link DEFAULT_WIDTH}. */
	readonly width?: number;

	/** The irreducible GF(2) polynomial, defaulting to {@link DEFAULT_POLYNOMIAL}. */
	readonly polynomial?: bigint;
};

// A degree-53 irreducible GF(2) polynomial (prime degree, matching Rabin's
// own counting argument for how many irreducible polynomials of a given
// degree exist — Rabin (1981), "Fingerprinting by Random Polynomials",
// p. 4). No single polynomial is canonical across implementations — real
// systems each pick their own (restic's `chunker` package generates a fresh
// random one per repository via the same Ben-Or irreducibility test used
// here, specifically to avoid every installation sharing one fingerprint).
// This value was generated with a fixed-seed splitmix64 PRNG and verified
// irreducible via Ben-Or's test (for i in 1..deg/2, gcd(f, x^(2^i) - x mod f)
// == 1) — the exact algorithm restic's `Pol.Irreducible()` implements —
// then frozen here as this package's own reproducible default. Stored per
// this package's own convention (see `CrcParams.polynomial`): MSB-first,
// with the top (implicit, degree-53) bit omitted.
const DEFAULT_WIDTH = 53;
const DEFAULT_POLYNOMIAL = 0x1f219db5c554e1n;

/**
 * Rabin fingerprint: a GF(2) polynomial-division rolling hash (Rabin, 1981),
 * mathematically the same per-byte reduction as a non-reflected CRC (see
 * `_gf2-polynomial.ts`), plus a sliding window — the departing byte's
 * contribution is precomputed per byte value at construction time
 * (`removalTable_[byte]` = the fingerprint of `byte` followed by `windowSize -
 * 1` zero bytes) and XORed out before the incoming byte is folded in, following
 * the same construction restic's `chunker` package uses for content-defined
 * chunking.
 */
export class RabinFingerprint implements IRollingHash<bigint> {
	readonly windowSize: number;

	private readonly width_: number;
	private readonly table_: BigUint64Array;
	private readonly removalTable_: BigUint64Array;
	private readonly ring_: Uint8Array;
	private ringIndex_ = 0;
	private filled_ = 0;
	private value_ = 0n;

	constructor(windowSize: number, options?: RabinFingerprintOptions) {
		if (!Number.isInteger(windowSize) || windowSize < 1) {
			throw new RangeError("windowSize must be a positive integer");
		}

		const width = options?.width ?? DEFAULT_WIDTH;
		const polynomial = options?.polynomial ?? DEFAULT_POLYNOMIAL;

		if (!Number.isInteger(width) || width < 8) {
			throw new RangeError("width must be an integer >= 8");
		}

		this.windowSize = windowSize;
		this.width_ = width;
		this.table_ = buildGf2PolynomialTable(polynomial, width);
		this.ring_ = new Uint8Array(windowSize);
		this.removalTable_ = new BigUint64Array(256);

		for (let byte = 0; byte < 256; byte++) {
			let register = stepGf2Polynomial(0n, byte, this.table_, width);

			for (let i = 1; i < windowSize; i++) {
				register = stepGf2Polynomial(register, 0, this.table_, width);
			}

			this.removalTable_[byte] = register;
		}
	}

	get value(): bigint {
		return this.value_;
	}

	push(byteIn: number): bigint {
		const byte = byteIn & 0xff;
		let next = this.value_;

		if (this.filled_ === this.windowSize) {
			const byteOut = this.ring_[this.ringIndex_]!;

			next ^= this.removalTable_[byteOut]!;
		} else {
			this.filled_++;
		}

		this.value_ = stepGf2Polynomial(next, byte, this.table_, this.width_);
		this.ring_[this.ringIndex_] = byte;
		this.ringIndex_ = (this.ringIndex_ + 1) % this.windowSize;

		return this.value_;
	}
}
