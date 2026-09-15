import { mergeAll } from "@ac-kit/core";
import type { Simplify, UnionToIntersection } from "type-fest";

import { StopReason, StoppingDecision, StoppingPolicy } from "./sampler.js";

/**
 * Every combined policy's metadata in one record, since each contributes its
 * own fields to the sampler result.
 */
export type MergedMetadata<
	TSample,
	TPolicies extends readonly StoppingPolicy<TSample, object>[],
> = Simplify<
	UnionToIntersection<
		{
			[K in keyof TPolicies]: TPolicies[K] extends StoppingPolicy<
				TSample,
				infer TMetadata
			>
				? TMetadata
				: never;
		}[number]
	>
>;

/**
 * Every member's metadata in one record — flat, last wins.
 *
 * `map` widens the tuple to `object[]`, losing which member contributed what,
 * so the fold's result is restated as the intersection declared above.
 */
function mergeMetadata_<
	TSample,
	TPolicies extends readonly StoppingPolicy<TSample, object>[],
>(
	policies: TPolicies,
	samples: readonly TSample[],
): MergedMetadata<TSample, TPolicies> {
	return mergeAll(
		policies.map((policy) => policy.describe(samples)),
	) as MergedMetadata<TSample, TPolicies>;
}

/**
 * Adapts a policy to a different sample type by projecting each sample onto the
 * quantity that policy judges.
 *
 * A measure whose sample is a record of several quantities needs a different
 * rule per quantity. This is what lets each of those rules stay written against
 * a plain number and still compose under {@link allOfPolicies}.
 */
export function createProjectedPolicy<TSample, TProjected, TMetadata>(
	select: (sample: TSample) => TProjected,
	policy: StoppingPolicy<TProjected, TMetadata>,
): StoppingPolicy<TSample, TMetadata> {
	return {
		pilotSamples: policy.pilotSamples,
		evaluate: (samples) => policy.evaluate(Array.from(samples, select)),
		describe: (samples) => policy.describe(Array.from(samples, select)),
	};
}

/**
 * Satisfied once every policy is.
 *
 * What a measure reporting both deterministic and noisy quantities needs:
 * neither a confidence interval on a counter that never moves nor a settling
 * test on a timing is correct alone, so the run continues until each quantity
 * is judged by the rule that fits it.
 */
export function allOfPolicies<
	TSample,
	const TPolicies extends readonly StoppingPolicy<TSample, object>[],
>(
	policies: TPolicies,
): StoppingPolicy<TSample, MergedMetadata<TSample, TPolicies>> {
	return {
		pilotSamples: policies.reduce(
			(most, policy) => Math.max(most, policy.pilotSamples),
			1,
		),

		evaluate: (samples): StoppingDecision => {
			let suggested: number | undefined;
			let reason: StopReason | undefined;
			let satisfied = true;

			for (const policy of policies) {
				const decision = policy.evaluate(samples);

				if (decision.kind === "continue") {
					satisfied = false;
					// The most demanding policy dictates: a smaller batch would leave
					// it short again at the next boundary.
					suggested = Math.max(suggested ?? 0, decision.suggestedSamples ?? 0);
					continue;
				}

				reason ??= decision.reason;
			}

			if (satisfied) {
				return {
					kind: "satisfied",
					...(reason === undefined ? {} : { reason }),
				};
			}

			return {
				kind: "continue",
				...(suggested === undefined || suggested === 0
					? {}
					: { suggestedSamples: suggested }),
			};
		},

		describe: (samples) => mergeMetadata_(policies, samples),
	};
}

/**
 * Satisfied as soon as any policy is.
 *
 * For a measure whose quantities are alternative readings of the same thing,
 * where the first one to settle answers for the case.
 */
export function anyOfPolicies<
	TSample,
	const TPolicies extends readonly StoppingPolicy<TSample, object>[],
>(
	policies: TPolicies,
): StoppingPolicy<TSample, MergedMetadata<TSample, TPolicies>> {
	return {
		pilotSamples:
			policies.length === 0
				? 1
				: policies.reduce(
						(fewest, policy) => Math.min(fewest, policy.pilotSamples),
						Number.POSITIVE_INFINITY,
					),

		evaluate: (samples): StoppingDecision => {
			let suggested: number | undefined;

			for (const policy of policies) {
				const decision = policy.evaluate(samples);

				if (decision.kind === "satisfied") {
					return decision;
				}

				// The least demanding policy dictates: it will be the one to stop the
				// loop, so planning for a hungrier one wastes samples.
				if (decision.suggestedSamples !== undefined) {
					suggested = Math.min(
						suggested ?? Number.POSITIVE_INFINITY,
						decision.suggestedSamples,
					);
				}
			}

			return {
				kind: "continue",
				...(suggested === undefined ? {} : { suggestedSamples: suggested }),
			};
		},

		describe: (samples) => mergeMetadata_(policies, samples),
	};
}
