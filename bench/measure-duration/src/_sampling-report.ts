import * as z from "zod/mini";

export const durationStopReasonSchema = z.enum([
	"policy-satisfied",
	"min-time",
	"max-time",
	"max-runs",
	"cancelled",
	"failure",
	/** Pooled from executions that did not agree on why they stopped. */
	"mixed",
]);

/**
 * What the sampler did, and how well it did it.
 *
 * Three clocks rather than two, because round-robin interleaving makes wall
 * time and this-case time different numbers — and because `measuredMs /
 * activeMs` is a directly observable contamination ratio.
 */
export const durationSamplingReportSchema = z.object({
	requestedRelativeError: z.union([
		z.number(),
		z.literal("auto"),
		z.literal("off"),
	]),
	effectiveRelativeErrorTarget: z.nullable(z.number()),
	achievedRelativeError: z.nullable(z.number()),
	targetReached: z.boolean(),
	confidenceLevel: z.number(),
	estimator: z.enum(["mean", "median"]),
	stopReason: durationStopReasonSchema,

	/** Sum of the per-iteration timed spans. What the statistics describe. */
	measuredMs: z.number(),
	/**
	 * Wall time attributable to this case, hooks and recomputation included. The
	 * time bounds apply here, never to `elapsedMs`.
	 */
	activeMs: z.number(),
	/** First slice to last. Under interleaving it includes other cases' work. */
	elapsedMs: z.number(),

	samples: z.number(),
	batches: z.number(),
});
export type DurationSamplingReport = z.infer<
	typeof durationSamplingReportSchema
>;
