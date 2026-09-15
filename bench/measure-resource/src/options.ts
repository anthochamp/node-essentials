import { CaseCommonOptions, SamplingBounds } from "@ac-bench/core/runner";

export type ResourceSampling = SamplingBounds & {
	/** Batches run and discarded first, letting the JIT settle. Defaults to 2. */
	warmup: number;

	/**
	 * How tight the interval around CPU time must be before sampling stops.
	 *
	 * The byte counters are judged by settling instead, since a count that never
	 * varies has no interval worth tightening.
	 */
	relativeError: number | "auto" | "off";

	/** Confidence level for the CPU-time interval. Defaults to 0.95. */
	confidenceLevel: number;

	/**
	 * Relative spread within which the byte counters count as settled. Defaults
	 * to 0.02 — a heap delta repeats to within a fraction of a percent, not to
	 * the byte.
	 */
	allocationTolerance: number;

	/** Batches whose byte counters must agree before stopping. Defaults to 3. */
	stableBatches: number;

	/**
	 * Work one batch should amount to, in milliseconds. Defaults to 50 — far
	 * longer than a duration measure wants, because the counters are read once
	 * per batch and that cost is divided by the operations in it. A batch of one
	 * reports the measure's own bookkeeping as the case's allocation.
	 */
	targetBatchMs: number;
};

export const RESOURCE_SAMPLING_DEFAULTS = {
	warmup: 2,
	minRuns: 10,
	maxRuns: 2000,
	minTimeMs: 250,
	maxTimeMs: 10_000,
	relativeError: "auto",
	confidenceLevel: 0.95,
	allocationTolerance: 0.02,
	stableBatches: 3,
	targetBatchMs: 50,
} as const satisfies ResourceSampling;

export type ResourceConditionOptions = {
	sampling?: Partial<ResourceSampling>;
};

export type ResourceCaseOptions = CaseCommonOptions;
