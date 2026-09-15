/** `2 ** 1023` — half the value one intermediate overflow factors out. */
const TWO_POW_1023_ = 2 ** 1023;

/** One unit in the last place at `Number.MAX_VALUE`, i.e. `2 ** 971`. */
const MAX_ULP_ = 2 ** 971;

/**
 * An exactly-rounded running total: fold terms in one at a time with
 * {@link PreciseSum.add}, then read {@link PreciseSum.value} for the binary64
 * nearest the true mathematical sum of everything added so far — as if every
 * addition had been performed at infinite precision and rounded once at the
 * end.
 *
 * Shewchuk's partial-expansion algorithm (the one behind Python's `math.fsum`
 * and the `Math.sumPrecise` proposal): each term is folded into a list of
 * non-overlapping partial sums that together represent the running total
 * exactly. Intermediate overflow is compensated the way the proposal's
 * reference implementation does it, with a biased partial counting how many
 * times `2 ** 1024` has been factored out — so a run that leaves the finite
 * range and comes back still answers exactly.
 *
 * Prefer {@link sumPrecise} when the terms are already available as a single
 * iterable; that is the common case and it reads better. Reach for this class
 * when they are not — typically one loop feeding several totals at once (a
 * polygon centroid accumulating `cx`, `cy` and the signed area together), where
 * one iterable per total would mean re-deriving every term.
 *
 * Exact summation only removes the error of the **additions**. When the terms
 * are themselves products, round each one first with `@ac-kit/math-scalar`'s
 * `diffOfProducts` or `sumOfProducts`; a term that arrives already wrong cannot
 * be recovered here.
 *
 * See {@link sumPrecise} for when exact summation is worth reaching for at all.
 */
export class PreciseSum {
	private readonly partials: number[] = [];
	private partialCount = 0;

	/** Net count of `2 ** 1024` units factored out by intermediate overflow. */
	private overflowCount = 0;
	private sawPositiveInfinity = false;
	private sawNegativeInfinity = false;
	private sawNaN = false;

	/**
	 * Folds `value` into the running total.
	 *
	 * O(k) additions, where k is the number of live partials — 1 or 2 for
	 * well-conditioned input, bounded by the exponent range at worst.
	 *
	 * @param value The term to add. Non-finite terms are recorded separately and
	 *   settled when {@link value} is read.
	 */
	add(value: number): void {
		if (!Number.isFinite(value)) {
			if (Number.isNaN(value)) {
				this.sawNaN = true;
			} else if (value > 0) {
				this.sawPositiveInfinity = true;
			} else {
				this.sawNegativeInfinity = true;
			}

			return;
		}

		const { partials } = this;
		let current = value;
		let kept = 0;

		for (let index = 0; index < this.partialCount; index++) {
			let partial = partials[index]!;

			if (Math.abs(current) < Math.abs(partial)) {
				const swap = current;
				current = partial;
				partial = swap;
			}

			// `b - (sum - a)` is Dekker's fast two-sum, exact because the swap above
			// establishes its `|a| >= |b|` precondition.
			let high = current + partial;
			let low = partial - (high - current);

			if (!Number.isFinite(high)) {
				const sign = high > 0 ? 1 : -1;

				this.overflowCount += sign;

				// Overflow forces |current| into [2**1023, 2**1024), which makes both
				// subtractions exact; splitting them is what keeps 2**1024 — itself
				// unrepresentable — out of the expression.
				current = current - sign * TWO_POW_1023_ - sign * TWO_POW_1023_;

				if (Math.abs(current) < Math.abs(partial)) {
					const swap = current;
					current = partial;
					partial = swap;
				}

				high = current + partial;
				low = partial - (high - current);
			}

			if (low !== 0) {
				partials[kept++] = low;
			}

			current = high;
		}

		partials[kept] = current;
		this.partialCount = kept + 1;
	}

	/**
	 * The exactly-rounded total of every term added so far. Reading is O(k) and
	 * leaves the accumulator usable for further {@link add} calls.
	 *
	 * `-0` while no finite term has been added, matching `Math.sumPrecise` on an
	 * empty input; `NaN` if any term was `NaN` or if both infinities were seen.
	 */
	get value(): number {
		if (this.sawNaN || (this.sawPositiveInfinity && this.sawNegativeInfinity)) {
			return Number.NaN;
		}

		if (this.sawPositiveInfinity) {
			return Number.POSITIVE_INFINITY;
		}

		if (this.sawNegativeInfinity) {
			return Number.NEGATIVE_INFINITY;
		}

		if (this.partialCount === 0) {
			return -0;
		}

		if (this.overflowCount === 0) {
			return reducePartials_(
				this.partials,
				this.partialCount - 2,
				this.partials[this.partialCount - 1]!,
			);
		}

		return this.overflowValue_();
	}

	/**
	 * Settles a total that left the finite range along the way. The biased
	 * partial can only be brought back inside it by the single largest partial,
	 * and only when that partial opposes it; anything else is a real infinity.
	 */
	private overflowValue_(): number {
		const { overflowCount } = this;
		const partials = this.partials.slice(0, this.partialCount);
		let index = partials.length - 1;
		const largest = partials[index]!;

		index--;

		if (
			Math.abs(overflowCount) > 1 ||
			(overflowCount > 0 && largest > 0) ||
			(overflowCount < 0 && largest < 0)
		) {
			return overflowCount > 0
				? Number.POSITIVE_INFINITY
				: Number.NEGATIVE_INFINITY;
		}

		// Halved so the two-sum itself stays finite, then doubled back.
		const biased = overflowCount * TWO_POW_1023_;
		const halved = largest / 2;
		let high = biased + halved;
		let low = (halved - (high - biased)) * 2;

		if (Math.abs(2 * high) === Number.POSITIVE_INFINITY) {
			// `MAX_VALUE`'s last significand bit is 1, so subtracting exactly half
			// an ulp from 2**1024 rounds away from it under ties-to-even. A smaller
			// partial of the opposite sign is the only thing that pulls it back.
			if (high > 0) {
				return high === TWO_POW_1023_ &&
					low === -(MAX_ULP_ / 2) &&
					index >= 0 &&
					partials[index]! < 0
					? Number.MAX_VALUE
					: Number.POSITIVE_INFINITY;
			}

			return high === -TWO_POW_1023_ &&
				low === MAX_ULP_ / 2 &&
				index >= 0 &&
				partials[index]! > 0
				? -Number.MAX_VALUE
				: Number.NEGATIVE_INFINITY;
		}

		if (low !== 0) {
			index++;
			partials[index] = low;
			low = 0;
		}

		high *= 2;

		return reducePartials_(partials, index, high);
	}
}

/**
 * Adds the partials from smallest to largest starting at `startIndex`, then
 * settles the one case that ordering alone gets wrong: a result exactly halfway
 * between two binary64 values, where the partials still below it decide which
 * way it breaks.
 */
function reducePartials_(
	partials: readonly number[],
	startIndex: number,
	seed: number,
): number {
	let index = startIndex;
	let total = seed;
	let error = 0;

	while (index >= 0) {
		const high = total;
		const low = partials[index]!;

		index--;
		total = high + low;
		error = low - (total - high);

		if (error !== 0) {
			break;
		}
	}

	// Half-way ties round to even by default, which is the wrong way whenever a
	// remaining partial pushes the true sum off the midpoint; doubling the
	// error re-rounds only when that is what happened.
	if (
		index >= 0 &&
		((error < 0 && partials[index]! < 0) || (error > 0 && partials[index]! > 0))
	) {
		const doubled = error * 2;
		const adjusted = total + doubled;

		if (doubled === adjusted - total) {
			total = adjusted;
		}
	}

	return total;
}
