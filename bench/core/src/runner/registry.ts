import { MaybeAsyncCallable } from "@ac-kit/core";
import { Stack } from "@ac-kit/data";

import { MeasureId } from "../common/measure-data.js";

export type BeforeAfterAllHookFn = MaybeAsyncCallable<[signal: AbortSignal]>;
export type BeforeAfterEachHookFn = MaybeAsyncCallable<[signal: AbortSignal]>;

/**
 * Everything needed to reach one case again from a process that has only the
 * bench file.
 *
 * A measure whose iteration is a whole process (cold-start measurement, an
 * external command) has to tell the process it spawns which case to run, and
 * the spawned process has no IPC channel to ask over. Re-importing the file and
 * replaying this identity is the only way back to the same case.
 */
export type BenchCaseId = {
	/** Absolute path of the bench file that declared the case. */
	readonly file: string;

	/** Entry indices from the root condition down to the fork unit. */
	readonly conditionPath: readonly number[];

	/** Condition titles along the same path, used to detect a stale file. */
	readonly conditionTitles: readonly string[];

	/** The case's own title, for the same purpose. */
	readonly caseTitle: string;
};

/**
 * What a measure's case runner reports through.
 *
 * Every method returns `void`, never a promise: a case runner has nothing to
 * await, so no sink can be awaited from inside a timed region even by mistake.
 */
export type BenchCaseRunContext = {
	readonly signal: AbortSignal;

	/** Measure-specific overrides, opaque to the runner. */
	readonly measureOptions: Readonly<Record<string, unknown>>;

	/** Where this case lives, for measures that re-enter it in a subprocess. */
	readonly caseId: BenchCaseId;

	/**
	 * Yields to the next case, and resolves when this one's turn comes back.
	 *
	 * The one awaitable on this context, and deliberately so: it marks a boundary
	 * _between_ measured slices, never a point inside one. A measure calls it
	 * where a batch ends. When the runner is not interleaving it resolves
	 * immediately, so the same code serves both.
	 */
	round(): Promise<void>;

	/** Coarse, batched domain progress. Never per iteration. */
	progress(completed: number, total?: number): void;

	/** Large or secondary artefact. Emitted after measurement. */
	attach(body: string | Uint8Array, mediaType: string, name?: string): void;

	/** The typed case result, opaque here. Emitted after measurement. */
	setCaseResult(result: unknown): void;

	/** The typed condition aggregate, opaque here. Emitted at condition close. */
	setConditionResult(result: unknown): void;
};

export type BenchCaseRunFn<TArgs extends unknown[] = any[]> =
	MaybeAsyncCallable<[runContext: BenchCaseRunContext, ...args: TArgs]>;

export type BenchCase = {
	title: string;
	run: BenchCaseRunFn;
};

export type BenchConditionOptions = {
	onBegin?: MaybeAsyncCallable<[signal: AbortSignal]>;
	onEnd?: MaybeAsyncCallable<[signal: AbortSignal]>;
	additionalRunArgs?: unknown[];
};

/** One item of a condition body, in declaration order. */
export type BenchConditionEntry =
	| { kind: "case"; case: BenchCase }
	| { kind: "condition"; condition: BenchCondition };

/**
 * A registered condition: its hooks, and the cases and nested conditions its
 * body declared, in declaration order.
 *
 * Nesting is **context specialization**, not grouping. Only a condition with no
 * nested condition of its own is executed (a "fork unit"); it runs its
 * enclosing conditions' cases as well as its own, under their hooks. So an
 * outer condition declaring the cases and two inner conditions declaring
 * nothing but a different `beforeAll` measures those same cases twice, once per
 * setup — which is the point of writing a hierarchy at all.
 *
 * A condition that declares both cases and a nested condition therefore never
 * runs its cases on their own: they run inside each of its descendants.
 */
export type BenchCondition = {
	measure: MeasureId;
	title: string;
	options: BenchConditionOptions | null;

	/** Cases and nested conditions, in declaration order. */
	entries: BenchConditionEntry[];

	beforeAll: BeforeAfterAllHookFn | null;
	afterAll: BeforeAfterAllHookFn | null;
	beforeEach: BeforeAfterEachHookFn | null;
	afterEach: BeforeAfterEachHookFn | null;
};

/** The cases `condition` declared directly, in declaration order. */
export function conditionCases(condition: BenchCondition): BenchCase[] {
	return condition.entries
		.filter((entry) => entry.kind === "case")
		.map((entry) => entry.case);
}

/** The conditions `condition` declared directly, in declaration order. */
export function conditionChildren(condition: BenchCondition): BenchCondition[] {
	return condition.entries
		.filter((entry) => entry.kind === "condition")
		.map((entry) => entry.condition);
}

let rootConditions_: BenchCondition[] = [];

const conditionStack_ = new Stack<BenchCondition>();

/** Returns the registered root conditions and resets the registry. */
export function drainConditions(): BenchCondition[] {
	const roots = rootConditions_;
	rootConditions_ = [];
	return roots;
}

export function registerCondition(
	measure: MeasureId,
	title: string,
	fn: () => void,
	options?: BenchConditionOptions,
): void {
	const condition: BenchCondition = {
		measure,
		title,
		options: options ?? null,
		entries: [],
		beforeAll: null,
		afterAll: null,
		beforeEach: null,
		afterEach: null,
	};

	const parent = conditionStack_.top();

	// A leaf inherits its enclosing conditions' cases, so a mixed chain would
	// report an inherited case under the leaf's measure — the wrong plugin.
	if (parent !== undefined && parent.measure !== measure) {
		throw new Error(
			`A ${measure} condition cannot be nested inside a ${parent.measure} condition`,
		);
	}

	conditionStack_.push(condition);
	try {
		fn();
	} finally {
		conditionStack_.pop();
	}

	if (parent === undefined) {
		rootConditions_.push(condition);
	} else {
		parent.entries.push({ kind: "condition", condition });
	}
}

export function registerCase<TExecuteArgs extends unknown[] = []>(
	measure: MeasureId,
	title: string,
	execute: BenchCaseRunFn<TExecuteArgs>,
): void {
	const condition = conditionStack_.top();

	if (condition === undefined || condition.measure !== measure) {
		throw new Error(
			`A ${measure} case must be registered inside a ${measure} condition callback`,
		);
	}

	if (conditionCases(condition).some((c) => c.title === title)) {
		throw new Error(
			`A ${measure} case with title "${title}" has already been registered in this condition`,
		);
	}

	condition.entries.push({ kind: "case", case: { title, run: execute } });
}

export function registerBeforeAll(fn: BeforeAfterAllHookFn): void {
	const condition = requireOpenCondition_("beforeAll");

	if (condition.beforeAll !== null) {
		throw new Error("beforeAll() can only be called once per condition");
	}

	condition.beforeAll = fn;
}

export function registerAfterAll(fn: BeforeAfterAllHookFn): void {
	const condition = requireOpenCondition_("afterAll");

	if (condition.afterAll !== null) {
		throw new Error("afterAll() can only be called once per condition");
	}

	condition.afterAll = fn;
}

export function registerBeforeEach(fn: BeforeAfterEachHookFn): void {
	const condition = requireOpenCondition_("beforeEach");

	if (condition.beforeEach !== null) {
		throw new Error("beforeEach() can only be called once per condition");
	}

	condition.beforeEach = fn;
}

export function registerAfterEach(fn: BeforeAfterEachHookFn): void {
	const condition = requireOpenCondition_("afterEach");

	if (condition.afterEach !== null) {
		throw new Error("afterEach() can only be called once per condition");
	}

	condition.afterEach = fn;
}

function requireOpenCondition_(hookName: string): BenchCondition {
	const condition = conditionStack_.top();

	if (condition === undefined) {
		throw new Error(`${hookName}() must be called inside a condition callback`);
	}

	return condition;
}
