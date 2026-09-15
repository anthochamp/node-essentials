import * as z from "zod/mini";

/**
 * Measure option set on the one-shot invocation inside a spawned iteration.
 *
 * Same registration, same case body, different job: the spawned process must
 * run the body exactly once instead of entering the sampler, or every iteration
 * would recursively spawn a whole sampling run of its own.
 */
export const SINGLE_ITERATION_OPTION = "singleIteration";

/** Sole argument of {@link iteration-child}, as one JSON argv string. */
export const iterationPayloadSchema = z.object({
	file: z.string(),
	conditionPath: z.array(z.number()),
	conditionTitles: z.array(z.string()),
	caseTitle: z.string(),
});
export type IterationPayload = z.infer<typeof iterationPayloadSchema>;
