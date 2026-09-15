import {
	allOfPolicies,
	BenchCaseRunContext,
	createProjectedPolicy,
	createRelativeErrorPolicy,
	createStabilityPolicy,
	Sampler,
} from "@ac-bench/core/runner";
import {
	defaults,
	formatError,
	isThenable,
	MaybeAsyncCallable,
} from "@ac-kit/core";

import {
	allocatedBytes,
	canObserveGc,
	cpuTimeMs,
	forceCollection,
	GcRecorder,
	gcSince,
	hasExposedCollector,
	readHeapLimitBytes,
	readResourceCounters,
} from "./_counters.js";
import { composeResourceBenchStatistics } from "./_statistics.js";
import { ResourceBenchRunCaseResult, ResourceBenchSample } from "./_types.js";
import { detectResourceBenchWarnings } from "./_warnings.js";
import {
	RESOURCE_SAMPLING_DEFAULTS,
	ResourceCaseOptions,
	ResourceConditionOptions,
	ResourceSampling,
} from "./options.js";

export type ResourceCaseFn = MaybeAsyncCallable<[signal: AbortSignal]>;

export type RunResourceCaseOptions = ResourceCaseOptions & {
	conditionOptions?: ResourceConditionOptions;
};

/**
 * Runs one batch and returns what it cost, per operation.
 *
 * Nothing inside the timed loop may allocate, or the measure reports its own
 * bookkeeping as the case's: `process.memoryUsage()` builds a result object per
 * call, so the peak is tracked through `memoryUsage.rss()`, which returns a
 * number, and the heap counters are read at the boundaries only.
 *
 * The collection before the batch is deliberately outside the measured window:
 * it establishes the floor the growth is measured from, and its own cost is not
 * part of what the case allocated.
 */
async function measureBatch_(
	fn: ResourceCaseFn,
	iterations: number,
	gc: GcRecorder,
	signal: AbortSignal,
): Promise<ResourceBenchSample> {
	forceCollection();

	const before = readResourceCounters();
	const gcBefore = gc.read();

	let rssPeakBytes = before.rssBytes;

	for (let index = 0; index < iterations; index++) {
		signal.throwIfAborted();

		// Awaiting unconditionally would allocate promise machinery per iteration
		// for a synchronous case, which is allocation this measure would then
		// attribute to the case.
		const returned = fn(signal);
		if (isThenable(returned)) {
			await returned;
		}

		const rss = process.memoryUsage.rss();
		if (rss > rssPeakBytes) {
			rssPeakBytes = rss;
		}
	}

	const after = readResourceCounters();
	const gcDelta = gcSince(gcBefore, gc.read());

	return {
		operations: iterations,
		cpuTimeMs: cpuTimeMs(before, after) / iterations,
		allocatedBytes: allocatedBytes(before, after) / iterations,
		heapPeakBytes: Math.max(before.heapUsedBytes, after.heapUsedBytes),
		rssBytes: rssPeakBytes,
		gcCount: gcDelta === null ? null : gcDelta.count / iterations,
		gcPauseMs: gcDelta === null ? null : gcDelta.pauseMs / iterations,
	};
}

export async function runResourceCase(
	title: string,
	fn: ResourceCaseFn,
	context: BenchCaseRunContext,
	options?: RunResourceCaseOptions,
): Promise<void> {
	const { signal } = context;
	signal.throwIfAborted();

	const sampling = defaults<ResourceSampling>(
		options?.conditionOptions?.sampling ?? {},
		RESOURCE_SAMPLING_DEFAULTS,
	);
	const tags = options?.tags ?? {};
	const forcedCollection = hasExposedCollector();

	const samples: ResourceBenchSample[] = [];
	const heapLimitBytes = readHeapLimitBytes();

	try {
		await options?.setup?.(signal);

		using gc = new GcRecorder(canObserveGc());

		for (let iteration = 0; iteration < sampling.warmup; iteration++) {
			signal.throwIfAborted();
			await fn(signal);
		}

		const sampler = new Sampler<ResourceBenchSample, object>(
			allOfPolicies([
				createStabilityPolicy<ResourceBenchSample>(
					(sample) => [sample.allocatedBytes],
					{
						window: sampling.stableBatches,
						tolerance: sampling.allocationTolerance,
					},
				),
				createProjectedPolicy(
					(sample: ResourceBenchSample) => sample.cpuTimeMs,
					createRelativeErrorPolicy({
						minRuns: sampling.minRuns,
						relativeError: sampling.relativeError,
						confidenceLevel: sampling.confidenceLevel,
						estimator: "median",
					}),
				),
			]),
			{
				bounds: {
					minRuns: sampling.minRuns,
					maxRuns: sampling.maxRuns,
					minTimeMs: sampling.minTimeMs,
					maxTimeMs: sampling.maxTimeMs,
				},
				signal,
				// One sample is one batch, and the sampler sizes the next batch in
				// iterations — so this is the cost of one operation, not of the batch
				// the sample came from.
				costOf: (sample) => sample.cpuTimeMs,
				targetBatchMs: sampling.targetBatchMs,
			},
		);

		for (
			let size = sampler.nextBatch();
			size !== null;
			size = sampler.nextBatch()
		) {
			const startedAt = performance.now();
			const sample = await measureBatch_(fn, size, gc, signal);

			samples.push(sample);
			sampler.observe([sample], performance.now() - startedAt);
			context.progress(samples.length);
		}
	} catch (error) {
		let failureMessage: string;
		try {
			await options?.teardown?.(signal);

			failureMessage = formatError(error);
		} catch (tearDownError) {
			failureMessage = formatError(
				new SuppressedError(
					tearDownError,
					error,
					"teardown failed after case failure",
				),
			);
		}

		context.setCaseResult({
			name: title,
			tags,
			statistics: null,
			forcedCollection,
			warnings: [],
			failure: failureMessage,
		} satisfies ResourceBenchRunCaseResult);
		return;
	}

	await options?.teardown?.(signal);

	const statistics = composeResourceBenchStatistics(samples, heapLimitBytes);

	context.setCaseResult({
		name: title,
		tags,
		statistics,
		forcedCollection,
		warnings: detectResourceBenchWarnings(statistics, forcedCollection),
	} satisfies ResourceBenchRunCaseResult);
}
