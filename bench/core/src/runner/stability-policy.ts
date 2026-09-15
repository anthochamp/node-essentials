import { StoppingDecision, StoppingPolicy } from "./sampler.js";

export type StabilityMetadata = {
	/** The number of trailing samples required to agree for stability. */
	requiredStableSamples: number;

	/** Whether the watched quantities have settled according to the policy. */
	stable: boolean;

	/** The number of trailing samples that agreed, up to the window size. */
	stableSamples: number;
};

export type StabilityOptions = {
	/** Trailing samples that must agree. Defaults to 3. */
	readonly window?: number;

	/** Samples taken before the policy is consulted. Defaults to `window`. */
	readonly pilotSamples?: number;

	/**
	 * Relative spread tolerated within the window. Defaults to 0 — exact
	 * equality, which is what a counter that genuinely never varies gives.
	 *
	 * Bytes are not that: a heap delta repeats to within a fraction of a percent
	 * rather than to the byte, so a measure reporting sizes rather than counts
	 * has to say how close is close enough.
	 */
	readonly tolerance?: number;
};

const DEFAULT_WINDOW_ = 3;

/**
 * Stops once the watched quantities have stopped changing.
 *
 * The counterpart to {@link createRelativeErrorPolicy}, for quantities that do
 * not vary: an allocation count is the same every run, so a confidence interval
 * around it says nothing, and "enough samples" means "it has settled" instead.
 *
 * Each evaluation costs `O(window × selected)`, independent of how many samples
 * have accumulated.
 *
 * @param select The quantities to watch, in a fixed order. Every one of them
 *   must settle; a single unsettled entry keeps sampling.
 * @returns A policy for {@link Sampler}.
 */
export function createStabilityPolicy<TSample>(
	select: (sample: TSample) => readonly number[],
	options: StabilityOptions = {},
): StoppingPolicy<TSample, StabilityMetadata> {
	const window = Math.max(2, options.window ?? DEFAULT_WINDOW_);
	const tolerance = options.tolerance ?? 0;

	const stableSamples = (samples: readonly TSample[]): number => {
		if (samples.length < window) {
			return samples.length;
		}

		let agreed = 1;
		for (let size = 2; size <= window; size++) {
			if (!isSettled_(samples, size, select, tolerance)) {
				break;
			}
			agreed = size;
		}

		return agreed;
	};

	return {
		pilotSamples: Math.max(1, options.pilotSamples ?? window),

		evaluate: (samples): StoppingDecision =>
			samples.length >= window && isSettled_(samples, window, select, tolerance)
				? { kind: "satisfied" }
				: { kind: "continue" },

		describe: (samples): StabilityMetadata => {
			const agreed = stableSamples(samples);

			return {
				stableSamples: agreed,
				requiredStableSamples: window,
				stable: agreed >= window,
			};
		},
	};
}

/** Whether every watched quantity holds steady across the last `size` samples. */
function isSettled_<TSample>(
	samples: readonly TSample[],
	size: number,
	select: (sample: TSample) => readonly number[],
	tolerance: number,
): boolean {
	const first = select(samples[samples.length - size]!);

	const minima = [...first];
	const maxima = [...first];

	for (
		let offset = samples.length - size + 1;
		offset < samples.length;
		offset++
	) {
		const values = select(samples[offset]!);

		for (let index = 0; index < minima.length; index++) {
			const value = values[index] ?? 0;

			minima[index] = Math.min(minima[index]!, value);
			maxima[index] = Math.max(maxima[index]!, value);
		}
	}

	for (let index = 0; index < minima.length; index++) {
		const low = minima[index]!;
		const high = maxima[index]!;
		const spread = high - low;

		if (spread === 0) {
			continue;
		}

		if (spread > tolerance * Math.max(Math.abs(high), Math.abs(low))) {
			return false;
		}
	}

	return true;
}
