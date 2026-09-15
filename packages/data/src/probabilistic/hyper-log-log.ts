import type { Hash32 } from "./hash32.js";

export type HyperLogLogOptions<T> = {
	/** See {@link Hash32}: required, and why it cannot be defaulted. */
	hash: Hash32<T>;
	/**
	 * Register-index bits, `4 .. 16`. Defaults to `12`.
	 *
	 * The estimator uses `2 ** precision` one-byte registers, and its relative
	 * error is about `1.04 / sqrt(2 ** precision)` — so `12` costs 4 KiB for
	 * roughly 1.6% error, and each extra bit halves the error while doubling the
	 * memory.
	 */
	precision?: number;
};

/**
 * Estimates how many **distinct** items a stream contained, in memory that does
 * not grow with the answer.
 *
 * A `Set` answers exactly and costs O(distinct); this answers approximately and
 * costs `2 ** precision` bytes whether the stream held a thousand items or a
 * billion. Use it when the cardinality is large, approximate is acceptable, and
 * the exact members are not needed afterwards — they cannot be recovered. The
 * estimate is never exact, not even for a handful of items.
 *
 * The estimator is the standard one: hash each item, take the low `precision`
 * bits as a register index, count the leading zeros of the rest, and keep the
 * maximum per register. The harmonic mean of `2 ** register` across registers
 * is proportional to the cardinality; the small-range correction (linear
 * counting over the empty registers) covers the regime where the raw estimate
 * is biased.
 *
 * Time complexity: O(1) per `add`, O(2 ** precision) per `count`. The estimate
 * is stable — adding the same item twice changes nothing.
 *
 * @template T The item type.
 */
export class HyperLogLog<T> {
	/** One byte per register: a 32-bit hash cannot produce a rank above 32. */
	private readonly registers: Uint8Array;
	private readonly hash: Hash32<T>;
	private readonly indexBits: number;
	private readonly alpha: number;

	/** The number of registers, `2 ** precision`. */
	readonly registerCount: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: HyperLogLogOptions<T>,
	) {
		const precision = options.precision ?? 12;

		if (!Number.isInteger(precision) || precision < 4 || precision > 16) {
			throw new RangeError(
				`Precision must be an integer in [4, 16], got ${precision}`,
			);
		}

		this.hash = options.hash;
		this.indexBits = precision;
		this.registerCount = 2 ** precision;
		this.registers = new Uint8Array(this.registerCount);
		this.alpha = biasCorrection(this.registerCount);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** The relative error to expect, as a fraction: `1.04 / sqrt(registers)`. */
	get relativeError(): number {
		return 1.04 / Math.sqrt(this.registerCount);
	}

	clear(): void {
		this.registers.fill(0);
	}

	/** O(1). Adding an item already seen leaves the estimate unchanged. */
	add(item: T): void {
		const hashed = this.hash(item, 0) >>> 0;
		const index = hashed & (this.registerCount - 1);

		// The remaining bits decide the rank; shifting the index out first is what
		// keeps the two uses of the hash independent.
		const remaining = hashed >>> this.indexBits;
		const width = 32 - this.indexBits;

		// `clz32` of 0 is 32, which would over-count: cap the rank at the number
		// of bits actually examined, plus one for the leading 1.
		const rank =
			remaining === 0 ? width + 1 : Math.clz32(remaining) - this.indexBits + 1;

		if (rank > this.registers[index]!) {
			this.registers[index] = rank;
		}
	}

	/** O(m) in the number of items. */
	addAll(items: Iterable<T>): void {
		for (const item of items) {
			this.add(item);
		}
	}

	/**
	 * The estimated number of distinct items. O(registerCount).
	 *
	 * Never exact, at any cardinality. Below ~2.5·registers linear counting takes
	 * over and is very close — but two items hashing to the same register are
	 * indistinguishable there too, so a handful of items can still estimate one
	 * or two low. Above that the harmonic-mean estimator lands within
	 * `relativeError` about 65% of the time and twice that about 95% of the
	 * time.
	 */
	count(): number {
		const { registers, registerCount } = this;

		let harmonicSum = 0;
		let emptyRegisters = 0;

		for (let index = 0; index < registerCount; index++) {
			const register = registers[index]!;

			harmonicSum += 2 ** -register;

			if (register === 0) {
				emptyRegisters++;
			}
		}

		const estimate = (this.alpha * registerCount ** 2) / harmonicSum;

		// Below ~2.5·m the raw estimator is biased; linear counting over the
		// still-empty registers is exact in that regime.
		if (estimate <= 2.5 * registerCount && emptyRegisters > 0) {
			return Math.round(
				registerCount * Math.log(registerCount / emptyRegisters),
			);
		}

		return Math.round(estimate);
	}

	/**
	 * Folds `other` in, so this estimator covers the union of both streams.
	 *
	 * Merging is lossless — the union's registers are the element-wise maxima —
	 * which is what lets partitions be counted independently and combined.
	 *
	 * @throws {RangeError} If the two were built with different precisions.
	 */
	merge(other: HyperLogLog<T>): void {
		if (other.registerCount !== this.registerCount) {
			throw new RangeError(
				"Cannot merge HyperLogLog estimators with different precisions",
			);
		}

		for (let index = 0; index < this.registerCount; index++) {
			if (other.registers[index]! > this.registers[index]!) {
				this.registers[index] = other.registers[index]!;
			}
		}
	}
}

/** The constant that debiases the harmonic mean, per Flajolet et al. */
function biasCorrection(registerCount: number): number {
	switch (registerCount) {
		case 16:
			return 0.673;
		case 32:
			return 0.697;
		case 64:
			return 0.709;
		default:
			return 0.7213 / (1 + 1.079 / registerCount);
	}
}
