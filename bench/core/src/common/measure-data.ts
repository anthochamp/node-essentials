import * as z from "zod/mini";

/** A registered measure's stable identifier, e.g. `"duration"`. */
export const measureIdSchema = z.string();
export type MeasureId = z.infer<typeof measureIdSchema>;

export const measureConditionResultSchema = z.object({
	kind: z.literal("condition-result"),
	measure: measureIdSchema,
	conditionTitle: z.string(),
	/** Opaque here; the owning measure's plugin validates it. */
	result: z.unknown(),
});
export type MeasureConditionResult = z.infer<
	typeof measureConditionResultSchema
>;

/** Which arm of the measurement plan an execution belongs to. */
export const measurementArmSchema = z.enum(["shared", "isolated"]);
export type MeasurementArm = z.infer<typeof measurementArmSchema>;

/**
 * One case, as measured by one process. The evidence.
 *
 * Emitted by the child as each case finishes, so a live view can fill in while
 * the run is still going. A case measured in several processes produces several
 * of these and exactly one {@link MeasureCaseResult}, which is the answer.
 */
export const measureCaseExecutionSchema = z.object({
	kind: z.literal("case-execution"),
	measure: measureIdSchema,
	caseTitle: z.string(),
	arm: measurementArmSchema,
	/** 0-based index within its arm. */
	replicate: z.number(),
	/** Opaque here; the owning measure's plugin validates it. */
	result: z.unknown(),
});
export type MeasureCaseExecution = z.infer<typeof measureCaseExecutionSchema>;

/**
 * One case's answer, pooled across every process that measured it.
 *
 * Emitted by the parent, which is the only party that sees every execution.
 * With a single execution it carries that execution's result unchanged.
 */
export const measureCaseResultSchema = z.object({
	kind: z.literal("case-result"),
	measure: measureIdSchema,
	caseTitle: z.string(),
	/** Opaque here; the owning measure's plugin validates it. */
	result: z.unknown(),
});
export type MeasureCaseResult = z.infer<typeof measureCaseResultSchema>;

export const loadErrorDataSchema = z.object({
	kind: z.literal("load-error"),
	file: z.string(),
	message: z.string(),
});
export type LoadErrorData = z.infer<typeof loadErrorDataSchema>;

export const measureDataSchema = z.discriminatedUnion("kind", [
	measureConditionResultSchema,
	measureCaseExecutionSchema,
	measureCaseResultSchema,
	loadErrorDataSchema,
]);
export type MeasureData = z.infer<typeof measureDataSchema>;

/** Validates a `data` payload that crossed the child/parent boundary. */
export function parseMeasureData(value: unknown): MeasureData {
	return measureDataSchema.parse(value);
}
