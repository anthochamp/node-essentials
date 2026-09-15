/**
 * How many contexts a condition is measured in, and under what conditions.
 *
 * Sampling (how many samples one case needs in one process) is the layer below
 * and is decided per case by the sampler. This is the layer above: how many
 * processes there are and what runs in each.
 *
 * Parameters, not an intent: naming an intent (`quick`, `rigorous`) and turning
 * it into these numbers is configuration, and lives in `@ac-bench/cli`.
 */
export type MeasurementPlan = {
	/**
	 * `P`: independent processes running the whole condition, cases together.
	 *
	 * Differences between cases measured in the same process are paired, so the
	 * process-level offset cancels. Replicating gives that offset a distribution
	 * instead of one unknown draw.
	 */
	readonly replicates: number;

	/**
	 * Ceiling on `P` when the run escalates.
	 *
	 * A plan that starts cheap buys more processes only for a comparison its
	 * intervals have not settled, and only up to here.
	 */
	readonly maxReplicates: number;

	/**
	 * `Q`: additional processes running one case alone, with the full ancestor
	 * hook chain.
	 *
	 * The only way to tell "this case is slow" from "this case is slow after the
	 * one before it". Costs an execution of every ancestor hook per case, so it
	 * stays small and off by default.
	 */
	readonly isolatedRuns: number;

	/**
	 * `R`: how many turns each case takes within one process.
	 *
	 * Above 1 the cases interleave, one measured slice each in turn, so none of
	 * them owns a single stretch of the process's life. At 1 they run to
	 * completion one after another, and the first case measured gets the cold
	 * interpreter while the last gets the warm one.
	 */
	readonly rounds: number;

	/** Wait for the machine to settle before each attempt. */
	readonly cooldown: boolean;

	/** Re-runs of a condition whose environment verdict was `"unstable"`. */
	readonly retryOnInstability: number;
};
