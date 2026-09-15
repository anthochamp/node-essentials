import { quantile, welchTStatistic } from "@ac-kit/math-stats";

import { CollectOptions, collectInterleavedTimings } from "./_collect.js";

/** `|t|` above which dudect-style tools conventionally report a leak. */
export const DEFAULT_LEAK_THRESHOLD = 4.5;

/** Default seed for {@link CollectOptions.random}, reproducible across runs. */
export const DEFAULT_SEED = 0x5eed_0001;

/** Options for {@link runDudectCheck}, extending the collection policy. */
export type DudectOptions = CollectOptions & {
	/**
	 * Upper-tail quantile beyond which a sample is dropped before the statistic
	 * is computed. Default `0.995`.
	 *
	 * Real hardware occasionally delays an execution far past its typical cost —
	 * an interrupt, a GC pause, a context switch — and those delays land on both
	 * classes equally often, so they dilute a real signal rather than create a
	 * false one. Cropping only the slow tail, symmetrically for both classes,
	 * removes that noise without touching the difference this is looking for.
	 */
	cropQuantile?: number;

	/** `|t|` above which {@link DudectResult.leakDetected} is `true`. */
	leakThreshold?: number;
};

export type DudectResult = {
	/** Welch's t-statistic on the (cropped) timing samples. */
	t: number;

	/** Welch–Satterthwaite degrees of freedom for `t`. */
	degreesOfFreedom: number;

	/** Samples collected per class, before cropping. */
	samplesPerClass: number;

	/** `true` when `|t|` exceeds the threshold. */
	leakDetected: boolean;
};

/**
 * A dudect-style constant-time check: times `classA` and `classB` under a
 * randomly interleaved schedule (see {@link collectInterleavedTimings}) and
 * reports whether their timing distributions are distinguishable.
 *
 * This only ever answers "is a timing difference detectable in this many
 * samples", never "why" — a positive result still needs a human to find the
 * secret-dependent branch or memory access it came from, and a negative result
 * only means none was found at this sample count, not that none exists.
 * Increase {@link CollectOptions.samples} to raise the harness's power to
 * detect a smaller leak.
 *
 * The classic dudect design compares one **fixed** secret input, called
 * repeatedly, against a **new random** secret input generated for every call of
 * the other class — pass closures built that way, not two closures over the
 * same fixed input or the test has no power to detect anything.
 *
 * @param classA First closure to time.
 * @param classB Second closure to time.
 * @param options Sampling, cropping and threshold policy.
 * @returns The statistic and its leak verdict.
 */
export async function runDudectCheck(
	classA: () => void,
	classB: () => void,
	options: DudectOptions,
): Promise<DudectResult> {
	const cropQuantile = options?.cropQuantile ?? 0.995;
	const leakThreshold = options?.leakThreshold ?? DEFAULT_LEAK_THRESHOLD;

	const { classA: rawA, classB: rawB } = await collectInterleavedTimings(
		classA,
		classB,
		options,
	);

	const croppedA = cropUpperTail_(rawA, cropQuantile);
	const croppedB = cropUpperTail_(rawB, cropQuantile);

	const { t, degreesOfFreedom } = welchTStatistic(croppedA, croppedB);

	return {
		t,
		degreesOfFreedom,
		samplesPerClass: rawA.length,
		leakDetected: Math.abs(t) > leakThreshold,
	};
}

function cropUpperTail_(samples: readonly number[], q: number): number[] {
	const sorted = [...samples].sort((a, b) => a - b);
	const limit = quantile(sorted, q);

	return sorted.filter((value) => value <= limit);
}
