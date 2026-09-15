import * as z from "zod/mini";

import { durationStatisticsSchema } from "./_statistics-schema.js";

/** Share of a case's median above which the baseline is most of the number. */
export const SPAWN_BASELINE_DOMINATES = 0.75;

/**
 * What starting the program costs when it is asked to do nothing.
 *
 * A benchmark whose iteration is a whole process pays this on every sample
 * while an in-process contender pays none of it. It is reported next to the
 * result rather than folded into it, so a comparison can never quietly be
 * between one number that had start-up removed and one that did not.
 */
export const spawnBaselineReportSchema = z.object({
	/** Program measured, as invoked. */
	command: z.string(),
	statistics: durationStatisticsSchema,
	/** Baseline median as a fraction of the case median. */
	share: z.number(),
	/** Whether it was removed from the samples behind `adjusted`. */
	subtracted: z.boolean(),
});
export type SpawnBaselineReport = z.infer<typeof spawnBaselineReportSchema>;
