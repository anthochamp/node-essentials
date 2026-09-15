import * as z from "zod/mini";

import { constantTimeWarningSchema } from "./_warnings.js";

const dudectResultSchema = z.object({
	t: z.number(),
	degreesOfFreedom: z.number(),
	samplesPerClass: z.number(),
	leakDetected: z.boolean(),
});

export const constantTimeCaseResultSchema = z.object({
	title: z.string(),
	dudectResult: z.nullable(dudectResultSchema),
	tags: z.record(z.string(), z.string()),
	warnings: z.array(constantTimeWarningSchema),
	failureMessage: z.nullable(z.string()),
});
export type ConstantTimeCaseResult = z.infer<
	typeof constantTimeCaseResultSchema
>;

export const constantTimeConditionResultSchema = z.object({
	title: z.string(),
	results: z.array(constantTimeCaseResultSchema),
});
export type ConstantTimeConditionResult = z.infer<
	typeof constantTimeConditionResultSchema
>;
