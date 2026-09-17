import { isThenable } from "@ac-kit/core";
import * as z from "zod/mini";

import { DurationStatistics } from "./_statistics-schema.js";
import { summarise } from "./_statistics.js";

/**
 * The shape of a case body, which decides what its harness costs.
 *
 * `fn.constructor.name === "AsyncFunction"` alone is not a reliable signal — it
 * misses a plain function returning a promise, which is the common shape for a
 * case that delegates. What the body actually returned is.
 */
export const harnessShapeSchema = z.enum([
	"sync",
	"async-function",
	"thenable",
]);
export type HarnessShape = z.infer<typeof harnessShapeSchema>;

export const harnessOverheadSchema = z.object({
	shape: harnessShapeSchema,
	medianMs: z.number(),
	/** Overhead median as a fraction of the case median. */
	share: z.number(),
	/** Whether it was removed from the reported samples, or only reported. */
	subtracted: z.boolean(),
});
export type HarnessOverhead = z.infer<typeof harnessOverheadSchema>;

/** Fraction of a case's runtime above which its harness dominates the number. */
export const HARNESS_OVERHEAD_DOMINATES = 0.25;

/** Enough to take a median of something this cheap, and no more. */
const CALIBRATION_SAMPLES_ = 50;

export function detectHarnessShape(
	runFn: (signal: AbortSignal) => unknown,
	returned: unknown,
): HarnessShape {
	if (!isThenable(returned)) {
		return "sync";
	}

	return runFn.constructor.name === "AsyncFunction"
		? "async-function"
		: "thenable";
}

/**
 * Measures a no-op body of `shape` through the identical timed span the real
 * case is measured through, so what is calibrated is the harness and not the
 * benchmark.
 */
export async function calibrateHarnessOverhead(
	shape: HarnessShape,
	outlierThreshold: number,
	signal: AbortSignal,
): Promise<DurationStatistics> {
	const noop = createNoop_(shape);
	const spans: number[] = [];

	for (let iteration = 0; iteration < CALIBRATION_SAMPLES_; iteration++) {
		signal.throwIfAborted();

		const begin = performance.now();
		await noop();
		spans.push(performance.now() - begin);
	}

	return summarise(spans, outlierThreshold);
}

function createNoop_(shape: HarnessShape): () => unknown {
	switch (shape) {
		case "sync":
			return () => undefined;

		case "async-function":
			return async () => undefined;

		case "thenable":
			return () => Promise.resolve();
	}
}
