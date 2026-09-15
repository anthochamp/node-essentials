import {
	BenchCaseRunContext,
	createRelativeErrorPolicy,
	Sampler,
} from "@ac-bench/core/runner";
import { defaults, formatError } from "@ac-kit/core";

import {
	calibrateHarnessOverhead,
	detectHarnessShape,
	HarnessOverhead,
	HarnessShape,
} from "./_harness-overhead.js";
import { SINGLE_ITERATION_OPTION } from "./_iteration-protocol.js";
import {
	commandCaseCommand,
	IterationCommand,
	iterationProcessCommand,
	measureIteration,
	measureSpawnBaseline,
	spawnBaselineReport,
	summariseColdStart,
} from "./_iteration-source.js";
import { ColdStartPhases, ProcessGroup } from "./_process-execution.js";
import {
	DURATION_SAMPLING_DEFAULTS,
	DurationSampling,
} from "./_sampling-options.js";
import { DurationSamplingReport } from "./_sampling-report.js";
import { SpawnBaselineReport } from "./_spawn-baseline.js";
import { DurationStatistics } from "./_statistics-schema.js";
import { summarise } from "./_statistics.js";
import { DurationBenchRunCaseResult } from "./_types.js";
import { detectWarnings_ } from "./_warnings.js";
import { DurationCaseRunFn } from "./decl.js";
import {
	DurationCaseOptions,
	DurationCommandCaseOptions,
	DurationConditionOptions,
} from "./options.js";

export type DurationRunCaseOptions = DurationCaseOptions & {
	conditionOptions?: DurationConditionOptions;
	/** Set by `durationCommandCase`; the case body is then a formality. */
	commandCase?: {
		readonly command: string;
		readonly args: readonly string[];
		readonly options: DurationCommandCaseOptions | undefined;
	};
};

/** Above this predicted batch duration, cancellation is checked per iteration. */
const LONG_BATCH_MS_ = 200;

/**
 * Runs one benchmark case under the adaptive sampler.
 *
 * The loop belongs to the sampler: it decides how many samples to take next and
 * when the interval around the estimate is tight enough. What happens here is
 * only the measuring — the timed span is `performance.now()` immediately around
 * one iteration and nothing else, so hooks, statistics and reporting stay
 * outside the number being reported.
 *
 * An iteration is one call in this process, one fresh process running this same
 * case body, or one execution of an external program. All three go through the
 * same loop and the same stopping rule; only what an iteration _is_ differs.
 *
 * @param title Case name, carried into the reported result.
 * @param runFn The work to measure.
 * @param context Run context, used to report the result and check for abort.
 * @param options Sampling policy and execution mode.
 */
export async function runDurationCase(
	title: string,
	runFn: DurationCaseRunFn,
	context: BenchCaseRunContext,
	options?: DurationRunCaseOptions,
): Promise<void> {
	const { signal } = context;
	signal.throwIfAborted();

	// A spawned iteration re-enters this same case body; without this it would
	// start a sampling run of its own, one process deep, forever.
	if (context.measureOptions[SINGLE_ITERATION_OPTION] === true) {
		await runSingleIteration_(runFn, options, signal);
		return;
	}

	const sampling = defaults<DurationSampling>(
		options?.conditionOptions?.sampling,
		DURATION_SAMPLING_DEFAULTS,
	);
	const tags = options?.tags ?? {};
	const command = resolveCommand_(context, options);
	const execution =
		options?.commandCase !== undefined
			? "command"
			: (options?.execution ?? "in-process");

	if (command !== null && options?.overheadMs !== undefined) {
		if (options.subtractSpawnBaseline === true) {
			throw new Error(
				`Case "${title}" declares both overheadMs and subtractSpawnBaseline; they would be subtracted twice`,
			);
		}
	}

	const subtractBaseline =
		command !== null &&
		options?.overheadMs === undefined &&
		options?.subtractSpawnBaseline !== false;

	const group = command === null ? null : new ProcessGroup();
	const coldStartPhases: ColdStartPhases[] = [];

	let overheadMs = options?.overheadMs ?? 0;
	let baselineStatistics: DurationStatistics | null = null;

	const sampler = new Sampler(createRelativeErrorPolicy(sampling), {
		bounds: sampling,
		signal,
		costOf: (ms) => ms,
	});

	const timings: number[] = [];
	const correctedTimings: number[] = [];
	const adjustedTimings: number[] = [];
	let measuredMs = 0;
	let startedAt: number | null = null;
	let endedAt = 0;
	let shape: HarnessShape = "sync";
	let harnessMs = 0;
	let harnessOverhead: HarnessOverhead | null = null;

	try {
		// The case's own setup runs inside each spawned process, so that a cold
		// start is measured whole rather than with its preparation hoisted out.
		if (command === null) {
			await options?.setup?.(signal);
		}

		if (command === null) {
			// Warmup runs before the pilot and is never counted in the statistics.
			for (let iteration = 0; iteration < sampling.warmup; iteration++) {
				signal.throwIfAborted();

				await options?.beforeEach?.(signal);
				const returned = runFn(signal);

				if (iteration === 0) {
					shape = detectHarnessShape(runFn, returned);
				}

				await returned;
				await options?.afterEach?.(signal);
			}

			// After warmup and before the pilot, so the shape is known and the
			// measurement has not started.
			const harness = await calibrateHarnessOverhead(
				shape,
				sampling.outlierThreshold,
				signal,
			);

			harnessMs = sampling.subtractHarnessOverhead ? harness.medianMs : 0;
			harnessOverhead = {
				shape,
				medianMs: harness.medianMs,
				share: 0,
				subtracted: sampling.subtractHarnessOverhead,
			};
		} else {
			// A spawn is orders of magnitude above the call overhead a harness
			// correction addresses; what it needs removed is the program's own
			// start-up, which is what the baseline measures.
			baselineStatistics = await measureSpawnBaseline(
				group as ProcessGroup,
				command,
				{ warmup: sampling.warmup, runs: sampling.minRuns },
				signal,
			);

			if (subtractBaseline && baselineStatistics !== null) {
				overheadMs = baselineStatistics.medianMs;
			}
		}

		for (let size = sampler.nextBatch(); size !== null;) {
			const sliceStartedAt = performance.now();
			startedAt ??= sliceStartedAt;

			const batch: number[] = [];
			const longBatch =
				size * (measuredMs / Math.max(1, timings.length)) > LONG_BATCH_MS_;

			for (let iteration = 0; iteration < size; iteration++) {
				if (longBatch || command !== null) {
					signal.throwIfAborted();
				}

				await options?.beforeEach?.(signal);

				const spanMs =
					command === null
						? await measureInProcess_(runFn, signal)
						: await measureIteration(
								group as ProcessGroup,
								command,
								coldStartPhases,
								signal,
							);

				await options?.afterEach?.(signal);

				measuredMs += spanMs;
				timings.push(spanMs);

				// Negatives are kept rather than clamped: a one-sided truncation
				// would bias the result upward exactly where the correction helps.
				const corrected = spanMs - harnessMs;
				correctedTimings.push(corrected);
				adjustedTimings.push(corrected - overheadMs);

				// The controller steers on the number a comparison is made on.
				batch.push(corrected - overheadMs);
			}

			endedAt = performance.now();
			sampler.observe(batch, endedAt - sliceStartedAt);

			context.progress(timings.length);

			if (signal.aborted) {
				sampler.stop("cancelled");
				break;
			}

			size = sampler.nextBatch();

			// A batch is a slice, and this is the boundary between two of them: a
			// sibling case takes the next one. Asking the sampler first means a
			// case that is done never spends a turn discovering it.
			if (size !== null) {
				await context.round();
			}
		}
	} catch (error) {
		sampler.stop(signal.aborted ? "cancelled" : "failure");
		await group?.dispose();

		context.setCaseResult({
			name: title,
			tags,
			statistics: null,
			adjusted: null,
			overheadMs,
			timings: [],
			sampling: null,
			harnessOverhead: null,
			execution,
			spawnBaseline: null,
			coldStart: null,
			estimate: null,
			contamination: null,
			warnings: [],
			failure: await failureMessage_(error, options, signal),
		} satisfies DurationBenchRunCaseResult);
		return;
	}

	await group?.dispose();

	if (command === null) {
		await options?.teardown?.(signal);
	}

	const result = sampler.result();
	const report: DurationSamplingReport = {
		...result.metadata,
		stopReason: result.stopReason,
		measuredMs,
		activeMs: result.activeMs,
		elapsedMs: startedAt === null ? 0 : endedAt - startedAt,
		samples: timings.length,
		batches: result.batches,
	};

	// Outliers are flagged, never removed: dropping them would let the controller
	// reach its target by discarding the evidence that it had not.
	const statistics = summarise(correctedTimings, sampling.outlierThreshold);

	if (harnessOverhead !== null) {
		harnessOverhead = {
			...harnessOverhead,
			share:
				statistics.medianMs > 0
					? harnessOverhead.medianMs / statistics.medianMs
					: 1,
		};
	}

	const spawnBaseline: SpawnBaselineReport | null =
		command === null
			? null
			: spawnBaselineReport(
					command,
					baselineStatistics,
					statistics.medianMs,
					subtractBaseline && baselineStatistics !== null,
				);

	context.setCaseResult({
		name: title,
		tags,
		statistics,
		adjusted:
			overheadMs > 0
				? summarise(adjustedTimings, sampling.outlierThreshold)
				: null,
		overheadMs,
		timings,
		sampling: report,
		harnessOverhead,
		execution,
		spawnBaseline,
		coldStart: summariseColdStart(coldStartPhases),
		estimate: null,
		contamination: null,
		warnings: detectWarnings_({
			timings,
			statistics,
			overheadMs,
			minRuns: sampling.minRuns,
			sampling: report,
			harnessOverhead,
			spawnBaseline,
			needsBaselineArgs: command !== null && command.baselineArgs === null,
		}),
	} satisfies DurationBenchRunCaseResult);

	// After the timed region, and only on request: `child.send` has no transfer
	// list, so every sample is copied across the boundary.
	if (context.measureOptions["emitSamples"] === true) {
		context.attach(
			JSON.stringify(timings)!,
			"application/json",
			`${title} samples`,
		);
	}
}

async function measureInProcess_(
	runFn: DurationCaseRunFn,
	signal: AbortSignal,
): Promise<number> {
	const begin = performance.now();
	await runFn(signal);

	return performance.now() - begin;
}

/** What one iteration executes, or `null` when it is a call in this process. */
function resolveCommand_(
	context: BenchCaseRunContext,
	options: DurationRunCaseOptions | undefined,
): IterationCommand | null {
	if (options?.commandCase !== undefined) {
		return commandCaseCommand(
			options.commandCase.command,
			options.commandCase.args,
			options.commandCase.options,
		);
	}

	return options?.execution === "per-iteration-process"
		? iterationProcessCommand(context.caseId)
		: null;
}

/** The body of one spawned iteration: setup and teardown are part of the sample. */
async function runSingleIteration_(
	runFn: DurationCaseRunFn,
	options: DurationRunCaseOptions | undefined,
	signal: AbortSignal,
): Promise<void> {
	await options?.setup?.(signal);

	try {
		await runFn(signal);
	} finally {
		await options?.teardown?.(signal);
	}
}

async function failureMessage_(
	error: unknown,
	options: DurationRunCaseOptions | undefined,
	signal: AbortSignal,
): Promise<string> {
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
	return failureMessage;
}
