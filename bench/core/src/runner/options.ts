import { MaybeAsyncCallable } from "@ac-kit/core";

export type CaseCommonOptions = {
	/**
	 * An object containing key-value pairs that can be used to tag the case with
	 * arbitrary metadata. This can be useful for filtering or grouping cases in
	 * the output, or for providing additional context about the case.
	 */
	tags?: Record<string, string>;

	/**
	 * Run once before collection. Not measured. This is useful for allocating any
	 * resources that will be used during the case, or for performing any checks
	 * on the environment before collecting samples.
	 */
	setup?: MaybeAsyncCallable<[signal: AbortSignal]>;

	/**
	 * Run once after collection. Not measured. This is useful for releasing any
	 * resources that were used during the case, or for performing any checks on
	 * the environment after collecting samples.
	 */
	teardown?: MaybeAsyncCallable<[signal: AbortSignal]>;

	/**
	 * Run before each iteration. Not measured. This is useful for resetting any
	 * state that will be used during the case, or for performing any checks on
	 * the environment before each iteration.
	 */
	beforeEach?: MaybeAsyncCallable<[signal: AbortSignal]>;

	/**
	 * Run after each iteration. Not measured. This is useful for resetting any
	 * state that was used during the case, or for performing any checks on the
	 * environment after each iteration.
	 */
	afterEach?: MaybeAsyncCallable<[signal: AbortSignal]>;
};
