import { lerp } from "./lerp.js";

/**
 * Evenly spaced samples across a closed interval, endpoints included.
 *
 * The sequence form of {@link lerp}: sample `index` is `lerp(start, stop, index
 * / (count - 1))`. Interpolating rather than accumulating `start + index *
 * step` is what keeps the last sample exactly `stop` — an accumulated step
 * drifts, and a caller sampling a function that is singular at one endpoint
 * gets a point just inside or just outside the domain depending on the
 * rounding.
 *
 * Distinct from `@ac-kit/core`'s `range`, which is step-based with an exclusive
 * bound. Reach for this one when the sample _count_ is what matters and both
 * endpoints must be hit; reach for `range` when the _stride_ is what matters.
 *
 * O(`count`) time and O(`count`) memory — the whole sequence is materialised.
 *
 * @example
 * 	```ts
 * 	linspace(0, 1, 5); // [0, 0.25, 0.5, 0.75, 1]
 * 	linspace(0, 1, 5).at(-1) === 1; // true — the endpoint is exact
 * 	```;
 *
 * @param start The first sample.
 * @param stop The last sample.
 * @param count How many samples to produce. A `count` of 1 yields `[start]`,
 *   since no interval can be divided into zero segments.
 * @returns `count` samples ascending from `start` to `stop`.
 * @throws {RangeError} If `count` is not a positive safe integer, or if either
 *   endpoint is not finite.
 */
export function linspace(start: number, stop: number, count: number): number[] {
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new RangeError(`count must be a positive safe integer, got ${count}`);
	}
	if (!Number.isFinite(start) || !Number.isFinite(stop)) {
		throw new RangeError(
			`start and stop must be finite, got ${start} and ${stop}`,
		);
	}

	if (count === 1) {
		return [start];
	}

	const samples: number[] = [];
	const lastIndex = count - 1;
	for (let index = 0; index < count; index++) {
		samples.push(lerp(start, stop, index / lastIndex));
	}
	return samples;
}
