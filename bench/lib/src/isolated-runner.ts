import path from "node:path";

import type { MeasureExecution, MeasurePlugin } from "@ac-bench/core/plugin";
import {
	conditionFrame,
	MeasureRegistry,
	MeasureScheduling,
} from "@ac-bench/core/plugin";
import {
	DiscoveredCondition,
	MeasureCaseExecution,
	MeasureData,
} from "@ac-bench/core/runner";
import { shuffle } from "@ac-kit/algo";
import {
	ISink,
	openScope,
	ReportDiagnostic,
	ReportScopeId,
} from "@ac-kit/app-report";
import { formatError, snakeCase } from "@ac-kit/core";
import { mulberry32 } from "@ac-kit/math-random";
import type { DataFrame } from "@ac-kit/model-dataset";

import { CooldownGate } from "./cooldown.js";
import {
	EnvironmentMonitor,
	EnvironmentStability,
} from "./environment-monitor.js";
import { comparisonUnresolved } from "./escalation.js";
import {
	discoverConditionsInFile,
	ForkOptions,
	runForkUnitInChild,
} from "./fork-runner.js";
import { MeasurementPlan } from "./measurement-plan.js";

export type IsolatedRunOptions = {
	readonly sink: ISink<MeasureData>;
	/** Resolves each leaf's measure, whose `scheduling` constrains the fork. */
	readonly registry: MeasureRegistry;
	readonly signal: AbortSignal;
	readonly runId: string;
	readonly artifactCacheRoot: string;
	/** Case-insensitive substring patterns, matched on a case or condition title. */
	readonly filter?: readonly string[];
	/** How many contexts each condition is measured in. Defaults to one. */
	readonly plan?: MeasurementPlan;
	/**
	 * Seeds the replicate and case orderings.
	 *
	 * Randomising is not book-keeping: without it, thermal drift is confounded
	 * with replicate index and the process-level offset stops behaving like a
	 * random draw, which is the assumption every estimator above rests on. A
	 * fixed seed reproduces one run exactly.
	 */
	readonly orderSeed?: number;
	/** Round-robin rounds a measure may refuse. Default 1. */
	readonly rounds?: number;
	/** Watches the machine while each attempt measures. Omitted disables it. */
	readonly monitor?: EnvironmentMonitor;
	/** Waits between fork units. Omitted disables cooling. */
	readonly cooldown?: CooldownGate;
	/** Re-runs a condition whose verdict is `"unstable"`. Default 0. */
	readonly retryOnInstability?: number;
	/** Attach each case's raw samples, which are copied across the boundary. */
	readonly emitSamples?: boolean;
	/** Observes each child's pid, so a monitor can read its resident set. */
	readonly onChildPid?: (pid: number | undefined) => void;
	/** Imported by every child before the bench file, in order. */
	readonly setupFiles?: readonly string[];
	/** Wall-clock cap on one fork unit. `0` disables it. */
	readonly conditionTimeoutMs?: number;
	readonly heartbeatTimeoutMs?: number;
};

/** `node_modules/.cache/ac-bench`, relative to where the CLI was invoked. */
export function defaultArtifactCacheRoot(): string {
	return path.resolve(process.cwd(), "node_modules/.cache/ac-bench");
}

export function toForkOptions(options: IsolatedRunOptions): ForkOptions {
	return {
		runId: options.runId,
		artifactCacheRoot: options.artifactCacheRoot,
		signal: options.signal,
		...(options.onChildPid ? { onChildPid: options.onChildPid } : {}),
		...(options.setupFiles ? { setupFiles: options.setupFiles } : {}),
		...(options.conditionTimeoutMs !== undefined
			? { conditionTimeoutMs: options.conditionTimeoutMs }
			: {}),
		...(options.heartbeatTimeoutMs !== undefined
			? { heartbeatTimeoutMs: options.heartbeatTimeoutMs }
			: {}),
	};
}

/** The cases `condition` declared directly, within an optional entry range. */
export function discoveredCaseTitles(
	condition: DiscoveredCondition,
	start = 0,
	end = condition.entries.length,
): string[] {
	return condition.entries
		.slice(start, end)
		.filter((entry) => entry.kind === "case")
		.map((entry) => entry.title);
}

/** The conditions `condition` declared directly, each with its entry index. */
export function discoveredChildren(
	condition: DiscoveredCondition,
): [number, DiscoveredCondition][] {
	return condition.entries.flatMap((entry, index) =>
		entry.kind === "condition"
			? [[index, entry.condition] as [number, DiscoveredCondition]]
			: [],
	);
}

/**
 * Discovers `file`'s condition tree in its own child, then runs every
 * executable leaf in a child of its own.
 *
 * Enclosing scopes are opened here rather than in a child: one such scope spans
 * several children, so only the parent can own it.
 */
export async function runFileIsolated(
	file: string,
	options: IsolatedRunOptions,
): Promise<void> {
	const forkOptions = toForkOptions(options);

	let conditions: DiscoveredCondition[];

	try {
		conditions = await discoverConditionsInFile(file, forkOptions);
	} catch (error) {
		const message = formatError(error);
		process.stderr.write(`measure: failed to load ${file}: ${message}\n`);
		await options.sink.write({
			kind: "data",
			timestamp: Date.now(),
			scopeId: null,
			data: { kind: "load-error", file, message },
		});

		return;
	}

	const context: TreeContext_ = {
		file,
		options,
		forkOptions,
		cooldown: options.cooldown,
	};

	for (const [index, condition] of conditions.entries()) {
		if (options.signal.aborted) {
			return;
		}

		await visitCondition_(
			condition,
			context,
			[condition.title],
			[index],
			null,
			[],
			[],
		);
	}
}

type TreeContext_ = {
	readonly file: string;
	readonly options: IsolatedRunOptions;
	readonly forkOptions: ForkOptions;
	readonly cooldown: CooldownGate | undefined;
};

async function visitCondition_(
	condition: DiscoveredCondition,
	context: TreeContext_,
	titles: readonly string[],
	conditionPath: readonly number[],
	parentScopeId: ReportScopeId | null,
	before: readonly string[],
	after: readonly string[],
): Promise<void> {
	const children = discoveredChildren(condition);

	if (children.length === 0) {
		await forkLeaf_(condition, context, titles, conditionPath, parentScopeId, [
			...before,
			...discoveredCaseTitles(condition),
			...after,
		]);
		return;
	}

	// No `conditionMeasure`: an enclosing scope is not itself a measure condition, and
	// claiming one would fold its descendants' results into a single table.
	await using scope = openScope(
		context.options.sink,
		parentScopeId,
		titles.join(" > "),
		{ key: snakeCase(titles.join(" ")), signal: context.options.signal },
	);

	for (const [index, child] of children) {
		if (context.options.signal.aborted) {
			return;
		}

		// Same split as the child's own assembly: this condition's cases declared
		// above the descent point come first, the ones below it come last.
		await visitCondition_(
			child,
			context,
			[...titles, child.title],
			[...conditionPath, index],
			scope.id,
			[...before, ...discoveredCaseTitles(condition, 0, index)],
			[...discoveredCaseTitles(condition, index + 1), ...after],
		);
	}
}

async function forkLeaf_(
	condition: DiscoveredCondition,
	context: TreeContext_,
	titles: readonly string[],
	conditionPath: readonly number[],
	parentScopeId: ReportScopeId | null,
	available: readonly string[],
): Promise<void> {
	const caseFilter = selectCaseTitles_(
		available,
		titles,
		context.options.filter,
	);

	if (caseFilter.length === 0) {
		return;
	}

	const { scheduling } = context.options.registry.resolve(condition.measure);

	const rounds = resolveConditionRounds(
		scheduling,
		context.options.plan?.rounds ?? context.options.rounds,
	);

	const forkOptions = withScheduling_(context.forkOptions, scheduling);

	// `grouping: "case"` buys per-case isolation at the cost of pairing.
	const batches =
		scheduling.grouping === "case"
			? caseFilter.map((title) => [title])
			: [caseFilter];

	const plan = context.options.plan;
	const random = mulberry32(context.options.orderSeed ?? 1);

	// Every execution the plan calls for, shuffled together: replicate order and
	// case order both have to be random, and drawing them from one shuffled list
	// is the same thing as drawing them separately.
	const executions = shuffle(
		plannedExecutions_(batches, plan?.replicates ?? 1, plan?.isolatedRuns ?? 0),
		{ rand: random },
	);

	// The parent owns this scope because pooling spans every child under it: no
	// single child sees enough to state the case's answer.
	await using unitScope = openScope(
		context.options.sink,
		parentScopeId,
		titles.join(" > "),
		{
			key: snakeCase(titles.join(" ")),
			signal: context.options.signal,
			attributes: { conditionMeasure: condition.measure },
		},
	);

	const collected = new ExecutionCollector();
	/** The first fork unit failure, which the condition's scope answers for. */
	let failure: unknown = null;

	for (const execution of executions) {
		if (context.options.signal.aborted) {
			return;
		}

		const error = await runBatch_(
			context,
			titles,
			conditionPath,
			unitScope.id,
			execution,
			rounds,
			forkOptions,
			collected,
		);

		failure ??= error;
	}

	const plugin = context.options.registry.resolve(condition.measure);
	let pooled = poolAll_(collected, plugin, context, unitScope.id);

	// One process cannot tell a real difference from its own luck, so the plan
	// buys more processes — but only for a comparison that is still open, and
	// only up to what the mode is willing to spend.
	for (
		let replicate = plan?.replicates ?? 1;
		replicate < (plan?.maxReplicates ?? 1) &&
		comparisonUnresolved(
			conditionFrame_(plugin, titles, pooled),
			plugin.comparison,
		);
		replicate++
	) {
		if (context.options.signal.aborted) {
			break;
		}

		for (const batch of batches) {
			const error = await runBatch_(
				context,
				titles,
				conditionPath,
				unitScope.id,
				{
					caseFilter: batch,
					arm: "shared",
					replicate,
					suffix: ` [#${replicate + 1}]`,
				},
				rounds,
				forkOptions,
				collected,
			);

			failure ??= error;
		}

		pooled = poolAll_(collected, plugin, context, unitScope.id);
	}

	// Awaited, not fired and forgotten: the warnings a reporter derives from a
	// case result have to reach it before this scope ends, or they arrive with
	// nothing left to attach them to.
	for (const [caseTitle, result] of pooled) {
		await context.options.sink.write({
			kind: "data",
			timestamp: Date.now(),
			scopeId: unitScope.id,
			data: {
				kind: "case-result",
				measure: condition.measure,
				caseTitle,
				result,
			},
		});
	}

	// A condition whose child died did not measure what it was asked to, whatever
	// the surviving executions produced.
	if (failure !== null) {
		unitScope.fail(failure);
	}
}

/** The pooled results as a frame, for the escalation decision. */
function conditionFrame_(
	plugin: MeasurePlugin,
	titles: readonly string[],
	pooled: ReadonlyMap<string, unknown>,
): DataFrame {
	try {
		return conditionFrame(plugin, {
			title: titles.join(" > "),
			results: [...pooled.values()],
		});
	} catch {
		// A measure that cannot describe a partial condition has nothing to say
		// about whether more of it would help.
		return { fields: [], columns: [], rowCount: 0 };
	}
}

/**
 * Gathers each case's executions as their children report them.
 *
 * Insertion order is the order the cases first reported, which is randomised
 * per execution; the caller re-imposes declaration order so the table does not
 * shuffle between runs.
 */
class ExecutionCollector {
	private readonly byCase = new Map<string, MeasureExecution<unknown>[]>();

	add(data: MeasureCaseExecution): void {
		const existing = this.byCase.get(data.caseTitle);
		const execution: MeasureExecution<unknown> = {
			result: data.result,
			arm: data.arm,
			replicate: data.replicate,
		};

		if (existing === undefined) {
			this.byCase.set(data.caseTitle, [execution]);
			return;
		}

		existing.push(execution);
	}

	/** Folds a kept attempt in; a discarded one is simply never merged. */
	merge(other: ExecutionCollector): void {
		for (const [caseTitle, executions] of other.byCase) {
			const existing = this.byCase.get(caseTitle);

			if (existing === undefined) {
				this.byCase.set(caseTitle, [...executions]);
				continue;
			}

			existing.push(...executions);
		}
	}

	entries(): [string, MeasureExecution<unknown>[]][] {
		return [...this.byCase];
	}
}

/** Forwards everything, keeping a copy of the evidence the parent must pool. */
function collectingSink_(
	sink: ISink<MeasureData>,
	collected: ExecutionCollector,
): ISink<MeasureData> {
	return {
		write: (event, signal) => {
			if (event.kind === "data" && event.data.kind === "case-execution") {
				collected.add(event.data);
			}

			return sink.write(event, signal);
		},
		flush: (signal) => sink.flush(signal),
		// Owned by the run, not by one child.
		close: () => {},
	};
}

/** Combines each case's executions into the one result that answers for it. */
function poolAll_(
	collected: ExecutionCollector,
	plugin: MeasurePlugin,
	context: TreeContext_,
	scopeId: ReportScopeId,
): Map<string, unknown> {
	const pooled = new Map<string, unknown>();

	for (const [caseTitle, executions] of collected.entries()) {
		try {
			pooled.set(caseTitle, plugin.pool(executions));
		} catch (error) {
			void context.options.sink.write({
				kind: "diagnostic",
				timestamp: Date.now(),
				scopeId,
				severity: "error",
				code: "pool-failed",
				message: `could not combine ${executions.length} executions: ${formatError(error)}`,
				attributes: { "bench.case": caseTitle },
			});
		}
	}

	return pooled;
}

/** One child process's worth of work: which cases, in which arm, which repeat. */
type PlannedExecution_ = {
	readonly caseFilter: readonly string[];
	readonly arm: "shared" | "isolated";
	readonly replicate: number;
	/**
	 * Distinguishes this execution from its siblings in a scope title, or `""`
	 * when the plan called for only one and there is nothing to distinguish.
	 */
	readonly suffix: string;
};

/**
 * Expands a plan into the executions it calls for.
 *
 * The isolated arm runs each case alone but under the full ancestor hook chain,
 * exactly as the shared arm does. Skipping those hooks would be cheaper and
 * actively misleading: such a case would fail only in the isolated arm, and the
 * contamination estimate would be measuring a missing fixture rather than order
 * sensitivity.
 */
function plannedExecutions_(
	batches: readonly (readonly string[])[],
	replicates: number,
	isolatedRuns: number,
): PlannedExecution_[] {
	const executions: PlannedExecution_[] = [];

	for (const batch of batches) {
		for (let replicate = 0; replicate < replicates; replicate++) {
			executions.push({
				caseFilter: batch,
				arm: "shared",
				replicate,
				suffix: replicates > 1 ? ` [#${replicate + 1}]` : "",
			});
		}

		if (batch.length < 2) {
			// Running a lone case alone is the shared arm again; there is no order
			// for it to be sensitive to.
			continue;
		}

		for (const title of batch) {
			for (let replicate = 0; replicate < isolatedRuns; replicate++) {
				const repeat = isolatedRuns > 1 ? ` #${replicate + 1}` : "";

				executions.push({
					caseFilter: [title],
					arm: "isolated",
					replicate,
					suffix: ` [isolated ${title}${repeat}]`,
				});
			}
		}
	}

	return executions;
}

async function runBatch_(
	context: TreeContext_,
	titles: readonly string[],
	conditionPath: readonly number[],
	parentScopeId: ReportScopeId | null,
	execution: PlannedExecution_,
	rounds: number,
	forkOptions: ForkOptions,
	collected: ExecutionCollector,
): Promise<unknown> {
	const attempts = 1 + (context.options.retryOnInstability ?? 0);

	for (let attempt = 0; attempt < attempts; attempt++) {
		const lastAttempt = attempt === attempts - 1;
		const attemptExecutions = new ExecutionCollector();
		const outcome = await runAttempt_(
			context,
			titles,
			conditionPath,
			parentScopeId,
			execution,
			rounds,
			forkOptions,
			attempt,
			lastAttempt,
			attemptExecutions,
		);

		// Only contention justifies re-running; a warming machine only gets warmer.
		if (outcome.stability !== "unstable" || lastAttempt) {
			collected.merge(attemptExecutions);
			return outcome.error;
		}
	}

	return null;
}

type AttemptOutcome_ = {
	stability: EnvironmentStability;
	/** What ended the fork unit, or `null` when it ran to completion. */
	error: unknown;
};

/**
 * Runs one attempt, wrapped in a parent-owned scope whenever a retry is
 * possible.
 *
 * The child owns its own condition scope and reports its own status, so a
 * discarded attempt is marked `"skipped"` on the scope the parent owns rather
 * than by overwriting what the child said. With retries off there is one
 * attempt and no wrapper, so the common shape is unchanged.
 */ async function runAttempt_(
	context: TreeContext_,
	titles: readonly string[],
	conditionPath: readonly number[],
	parentScopeId: ReportScopeId | null,
	execution: PlannedExecution_,
	rounds: number,
	forkOptions: ForkOptions,
	attempt: number,
	lastAttempt: boolean,
	collected: ExecutionCollector,
): Promise<AttemptOutcome_> {
	const retrying = (context.options.retryOnInstability ?? 0) > 0;
	const label = executionLabel_(titles, execution);

	await using attemptScope = retrying
		? openScope(
				context.options.sink,
				parentScopeId,
				`${label} (attempt ${attempt + 1})`,
				{
					key: snakeCase(`${label} attempt ${attempt + 1}`),
					signal: context.options.signal,
					attributes: { "bench.attempt": attempt + 1 },
				},
			)
		: null;

	const scopeId = attemptScope?.id ?? parentScopeId;

	const writeDiagnostic = (diagnostic: ReportDiagnostic) => {
		void context.options.sink.write({
			kind: "diagnostic",
			timestamp: Date.now(),
			scopeId,
			...diagnostic,
		});
	};

	// `settle()` itself reports nothing while it waits — this is the only signal
	// a reporter gets that the run is paused for the machine rather than stuck.
	if (context.cooldown) {
		writeDiagnostic({
			severity: "info",
			code: "cooling-down",
			message: "waiting for the machine to settle before measuring",
		});
	}

	const cooldown = await context.cooldown?.settle(context.options.signal);
	for (const diagnostic of cooldown?.diagnostics ?? []) {
		writeDiagnostic(diagnostic);
	}

	const monitor = context.options.monitor;
	monitor?.start();

	const outcome = await runForkUnitInChild(
		{
			file: context.file,
			conditionPath: [...conditionPath],
			conditionTitles: [...titles],
			parentScopeId: scopeId,
			arm: execution.arm,
			replicate: execution.replicate,
			rounds,
			// Distinct per execution, so two replicates do not run their cases in
			// the same order and re-introduce the bias interleaving removes.
			orderSeed: executionSeed_(context.options.orderSeed ?? 1, execution),
			caseFilter: [...execution.caseFilter],
			emitSamples: context.options.emitSamples === true,
		},
		collectingSink_(context.options.sink, collected),
		writeDiagnostic,
		forkOptions,
	);

	const verdict = await monitor?.stop();
	context.options.onChildPid?.(undefined);

	for (const diagnostic of verdict?.diagnostics ?? []) {
		writeDiagnostic(diagnostic);
	}

	if (outcome.error !== null) {
		writeDiagnostic({
			severity: "error",
			code: "fork-unit-failed",
			message: formatError(outcome.error),
		});
	}

	const stability = verdict?.stability ?? "stable";

	if (stability === "unstable") {
		writeDiagnostic({
			// A retry that is also unstable is the one that gets kept, so it escalates.
			severity: lastAttempt && attempt > 0 ? "error" : "warning",
			code: "unstable-environment",
			message: `measured on a contended machine${execution.suffix}`,
			attributes: { "bench.stability": stability },
		});
	}

	attemptScope?.attributes({
		"bench.stability": stability,
		...(cooldown ? { "bench.cooldownMs": cooldown.cooldownMs } : {}),
	});

	if (stability === "unstable" && !lastAttempt) {
		attemptScope?.skip();
	}

	return { stability, error: outcome.error };
}

/** Distinguishes one execution from its siblings in a diagnostic or a scope. */
function executionLabel_(
	titles: readonly string[],
	execution: PlannedExecution_,
): string {
	return `${titles.join(" > ")}${execution.suffix}`;
}

/** Derives a per-execution seed, so each one shuffles its cases differently. */
function executionSeed_(runSeed: number, execution: PlannedExecution_): number {
	const arm = execution.arm === "isolated" ? 0x5bf0_3635 : 0;

	return (Math.imul(runSeed, 0x9e37_79b9) + execution.replicate + arm) | 0;
}

/**
 * A measure declaring `rounds: "one"` refuses round-robin interleaving whatever
 * the run asks for; the scheduler reads the declaration and never the measure
 * id.
 */
export function resolveConditionRounds(
	scheduling: MeasureScheduling,
	requested: number | undefined,
): number {
	return scheduling.rounds === "one" ? 1 : (requested ?? 1);
}

/** Merges a measure's declared child requirements into the run's own. */
function withScheduling_(
	base: ForkOptions,
	scheduling: MeasureScheduling,
): ForkOptions {
	if (scheduling.execArgv === undefined && scheduling.env === undefined) {
		return base;
	}

	return {
		...base,
		...(scheduling.execArgv
			? { execArgv: [...(base.execArgv ?? []), ...scheduling.execArgv] }
			: {}),
		...(scheduling.env ? { env: { ...base.env, ...scheduling.env } } : {}),
	};
}

/**
 * A pattern matching any title along the path selects every case the leaf runs;
 * otherwise only the cases whose own title matches survive.
 */
function selectCaseTitles_(
	available: readonly string[],
	titles: readonly string[],
	patterns: readonly string[] | undefined,
): string[] {
	if (patterns === undefined || patterns.length === 0) {
		return [...available];
	}

	const needles = patterns.map((pattern) => pattern.toLowerCase());
	const pathMatches = titles.some((title) =>
		needles.some((needle) => title.toLowerCase().includes(needle)),
	);

	if (pathMatches) {
		return [...available];
	}

	return available.filter((title) =>
		needles.some((needle) => title.toLowerCase().includes(needle)),
	);
}
