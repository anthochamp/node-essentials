import {
	CentralEstimator,
	RelativeErrorTarget,
	SamplingBounds,
} from "@ac-bench/core/runner";
import { DEFAULT_OUTLIER_THRESHOLD } from "@ac-kit/math-stats";

/**
 * Every sampling knob, fully populated.
 *
 * Frozen because it is the only place a default is applied: nothing downstream
 * may write `?? someDefault`, which is what makes a cross-wired option (reading
 * `minRuns` from `minTimeMs`, say) a single-file defect rather than a class of
 * them.
 */
export type DurationSampling = SamplingBounds & {
	/**
	 * Warmup iterations run before any measured samples, letting the JIT
	 * specialise and caches warm.
	 *
	 * Defaults to 3.
	 */
	warmup: number;

	/**
	 * How tight the confidence interval must be, relative to the estimate, before
	 * sampling stops.
	 *
	 * `"auto"` (the default) derives a target from the spread observed on this
	 * machine for this case, so a noisy runner and a quiet workstation each get
	 * an appropriate one. `"off"` reproduces the fixed-bound loop exactly, which
	 * is what a differential or regression run wants.
	 */
	relativeError: RelativeErrorTarget;

	/** Confidence level for the reported interval. Defaults to 0.95. */
	confidenceLevel: number;

	/**
	 * Defaults to `"median"`, whose uncertainty is the distribution-free
	 * order-statistic interval — the right choice for a distribution whose right
	 * tail is made of GC pauses and scheduler preemptions.
	 */
	estimator: CentralEstimator;

	/** Modified Z-score above which a sample is flagged. Defaults to 3.5. */
	outlierThreshold: number;

	/**
	 * Whether to subtract the harness overhead from each sample. Defaults to
	 * `false`.
	 */
	subtractHarnessOverhead: boolean;
};

/**
 * With an error target driving the loop, `maxRuns` is a safety net rather than
 * the primary control, and a `minTimeMs` that dominates the controller would
 * make the controller pointless.
 */
export const DURATION_SAMPLING_DEFAULTS = {
	warmup: 3,
	minRuns: 10,
	maxRuns: 100_000,
	minTimeMs: 250,
	maxTimeMs: 10_000,
	relativeError: "auto",
	confidenceLevel: 0.95,
	estimator: "median",
	outlierThreshold: DEFAULT_OUTLIER_THRESHOLD,
	subtractHarnessOverhead: false,
} as const satisfies DurationSampling;
