import { shuffle } from "@ac-kit/algo";
import {
	ISink,
	openScope,
	ReportScopeId,
	ReportScopeStatus,
	ScopeSession,
} from "@ac-kit/app-report";
import { RoundRobin } from "@ac-kit/async";
import { PeriodicalTimer, snakeCase } from "@ac-kit/core";
import { mulberry32 } from "@ac-kit/math-random";

import { MeasureData, MeasurementArm } from "../common/measure-data.js";
import { ForkUnit } from "./fork-units.js";
import { BenchCase, BenchCaseRunContext, BenchCondition } from "./registry.js";

const HEARTBEAT_INTERVAL_MS_ = 200;

export type ForkUnitRunOptions = {
	readonly sink: ISink<MeasureData>;

	/** Absolute path of the bench file this unit was loaded from. */
	readonly file: string;

	/** The parent-owned scope this fork unit's condition scope hangs under. */
	readonly parentScopeId: ReportScopeId | null;

	/** Case titles to run. Omitted runs all of them. */
	readonly caseFilter?: readonly string[];

	/**
	 * Shuffles the case order within this execution. `0` keeps declaration order.
	 *
	 * Every replicate running its cases in the same order would leave order bias
	 * in every one of them, so replicating would measure the bias rather than
	 * average it away.
	 */
	readonly orderSeed?: number;

	/** Measure-specific overrides, forwarded opaquely to the measure. */
	readonly measureOptions?: Readonly<Record<string, unknown>>;

	/**
	 * Which arm of the measurement plan this execution belongs to. Default
	 * shared.
	 */
	readonly arm?: MeasurementArm;

	/** 0-based index within the arm, identifying this execution. Default 0. */
	readonly replicate?: number;

	/**
	 * Above 1, cases take one measured slice each in turn instead of running to
	 * completion one after another. Default 1.
	 */
	readonly rounds?: number;

	readonly heartbeatIntervalMs?: number;
};

export type ForkUnitOutcome = {
	status: ReportScopeStatus;
	casesRun: number;
	casesFailed: number;
	/** Rounds every case took part in. `null` when nothing was interleaved. */
	pairedRounds: number | null;
	/** Rounds the longest-running case took. `null` when nothing was interleaved. */
	rounds: number | null;
};

/**
 * Runs one fork unit: every case it inherited from its enclosing conditions
 * plus its own, wrapped in the `beforeAll` hooks of the whole chain, outermost
 * first.
 *
 * Sibling fork units are run separately and, once isolation is on, in their own
 * processes — which is why an enclosing condition's `beforeAll` runs here again
 * rather than once for the whole tree.
 *
 * Never rethrows a case failure: a failed case closes its own scope as
 * `"failed"`, is counted in {@link ForkUnitOutcome.casesFailed}, and the
 * condition continues. A failed `beforeAll`/`afterAll` closes the condition
 * scope as `"failed"` and reports every remaining case as `"skipped"`.
 */
export async function runForkUnit(
	unit: ForkUnit,
	signal: AbortSignal,
	options: ForkUnitRunOptions,
): Promise<ForkUnitOutcome> {
	const chain = [...unit.ancestors, unit.condition];
	const title = unit.titles.join(" > ");
	const scopeKeyPrefix = unit.titles.join(" ");

	await using scope = openScope(options.sink, options.parentScopeId, title, {
		key: snakeCase(scopeKeyPrefix),
		signal,
		// Not `conditionMeasure`: this is one execution of the condition, and the
		// condition itself is owned by whoever pools every execution of it.
		attributes: {
			benchArm: options.arm ?? "shared",
			benchReplicate: options.replicate ?? 0,
		},
	});

	const cases = selectCases_(unit.cases, options.caseFilter, options.orderSeed);

	// Levels whose `onBegin` and `beforeAll` both completed, so only those get torn down.
	let entered = 0;
	let failure: unknown = null;

	try {
		for (const level of chain) {
			signal.throwIfAborted();

			await level.options?.onBegin?.(signal);
			await level.beforeAll?.(signal);

			entered += 1;
		}
	} catch (error) {
		failure = error;
	}

	let casesRun = 0;
	let casesFailed = 0;
	let turns: RoundRobin | null = null;

	if (failure === null) {
		// Interleaving is what makes a case-versus-case comparison legitimate: it
		// puts every case through every phase of the process's life instead of
		// giving one of them the cold start and another the warm middle.
		turns =
			(options.rounds ?? 1) > 1 && cases.length > 1
				? new RoundRobin(cases.length)
				: null;

		const outcomes =
			turns === null
				? await runSequentially_(
						cases,
						chain,
						unit,
						title,
						scopeKeyPrefix,
						signal,
						options,
						scope,
					)
				: await Promise.all(
						cases.map(async (benchCase, id) => {
							await turns!.take(id);

							try {
								return await runCase_(
									benchCase,
									chain,
									unit,
									title,
									scopeKeyPrefix,
									signal,
									options,
									scope,
									() => turns!.next(id),
								);
							} finally {
								turns!.leave(id);
							}
						}),
					);

		casesRun = outcomes.length;
		casesFailed = outcomes.filter((succeeded) => !succeeded).length;
	} else {
		for (const benchCase of cases) {
			await using skipped = openScope(options.sink, scope.id, benchCase.title, {
				key: snakeCase(`${scopeKeyPrefix} ${benchCase.title}`),
			});

			skipped.skip();
		}
	}

	for (const level of chain.slice(0, entered).toReversed()) {
		try {
			await level.afterAll?.(signal);
			await level.options?.onEnd?.(signal);
		} catch (error) {
			failure ??= error;
		}
	}

	const interleaving = {
		pairedRounds: turns?.minRounds ?? null,
		rounds: turns?.maxRounds ?? null,
	};

	// The comparison is still valid, but it rests on far less data than the
	// per-case sample counts suggest, and nothing else says so.
	if (
		turns !== null &&
		turns.maxRounds > 0 &&
		turns.minRounds * 2 < turns.maxRounds
	) {
		scope.diagnostic({
			severity: "warning",
			code: "paired-window-truncated",
			message: `cases were compared over ${turns.minRounds} of ${turns.maxRounds} rounds; the rest ran after some case had already stopped`,
			attributes: {
				"bench.pairedRounds": turns.minRounds,
				"bench.rounds": turns.maxRounds,
			},
		});
	}

	if (signal.aborted) {
		return { status: "cancelled", casesRun, casesFailed, ...interleaving };
	}

	if (failure !== null) {
		scope.fail(failure);

		return { status: "failed", casesRun, casesFailed, ...interleaving };
	}

	if (casesFailed > 0) {
		scope.fail(
			new Error(`${casesFailed} of ${casesRun} cases failed in "${title}"`),
		);

		return { status: "failed", casesRun, casesFailed, ...interleaving };
	}

	return { status: "ok", casesRun, casesFailed, ...interleaving };
}

/** Cases one after another, each running to completion before the next starts. */
async function runSequentially_(
	cases: readonly BenchCase[],
	chain: readonly BenchCondition[],
	unit: ForkUnit,
	title: string,
	scopeKeyPrefix: string,
	signal: AbortSignal,
	options: ForkUnitRunOptions,
	scope: ScopeSession<MeasureData>,
): Promise<boolean[]> {
	const outcomes: boolean[] = [];

	for (const benchCase of cases) {
		if (signal.aborted) {
			break;
		}

		outcomes.push(
			await runCase_(
				benchCase,
				chain,
				unit,
				title,
				scopeKeyPrefix,
				signal,
				options,
				scope,
				() => Promise.resolve(),
			),
		);
	}

	return outcomes;
}

function selectCases_(
	cases: readonly BenchCase[],
	caseFilter: readonly string[] | undefined,
	orderSeed: number | undefined,
): BenchCase[] {
	const wanted = caseFilter === undefined ? null : new Set(caseFilter);
	const selected =
		wanted === null
			? [...cases]
			: cases.filter((benchCase) => wanted.has(benchCase.title));

	return orderSeed === undefined || orderSeed === 0
		? selected
		: shuffle(selected, { rand: mulberry32(orderSeed) });
}

/**
 * Invokes one case body once, reporting nothing.
 *
 * For measures whose iteration is a whole process: the spawned process has no
 * sink and no IPC channel, and its result reaches the sampler as wall time and
 * an exit code. None of the condition chain's hooks run — a fresh process holds
 * none of the state they would set up, and paying `beforeAll` per iteration is
 * exactly the cost this execution mode exists to measure honestly.
 *
 * @param unit Fork unit the case belongs to, as resolved from the bench file.
 * @param caseTitle Which of the unit's cases to run.
 * @param signal Cancellation, forwarded to the case body.
 * @param options Bench file path and measure-specific overrides.
 * @throws {Error} If the unit has no case by that title.
 */
export async function runCaseOnce(
	unit: ForkUnit,
	caseTitle: string,
	signal: AbortSignal,
	options: {
		readonly file: string;
		readonly measureOptions: Readonly<Record<string, unknown>>;
	},
): Promise<void> {
	const benchCase = unit.cases.find(
		(candidate) => candidate.title === caseTitle,
	);

	if (benchCase === undefined) {
		throw new Error(
			`No case "${caseTitle}" in condition "${unit.titles.join(" > ")}"`,
		);
	}

	const context: BenchCaseRunContext = {
		signal,
		measureOptions: options.measureOptions,
		caseId: {
			file: options.file,
			conditionPath: unit.path,
			conditionTitles: unit.titles,
			caseTitle,
		},
		round: () => Promise.resolve(),
		progress: () => {},
		attach: () => {},
		setCaseResult: () => {},
		setConditionResult: () => {},
	};

	await benchCase.run(
		context,
		...(unit.condition.options?.additionalRunArgs ?? []),
	);
}

/** @returns `true` when the case completed without throwing. */
async function runCase_(
	benchCase: BenchCase,
	chain: readonly BenchCondition[],
	unit: ForkUnit,
	title: string,
	scopeKeyPrefix: string,
	signal: AbortSignal,
	options: ForkUnitRunOptions,
	conditionScope: ScopeSession<MeasureData>,
	turn: () => Promise<void>,
): Promise<boolean> {
	const condition = chain[chain.length - 1] as BenchCondition;

	await using scope = openScope(
		options.sink,
		conditionScope.id,
		benchCase.title,
		{
			key: snakeCase(`${scopeKeyPrefix} ${benchCase.title}`),
			signal,
			// Marks this scope as a case, so a reader finds one by what it is
			// rather than by counting levels up to its condition — plus its
			// declaration position, so a reporter can show cases in file order
			// even when round-robin or `orderSeed` ran them in a different one.
			attributes: {
				benchCase: benchCase.title,
				benchCaseIndex: unit.cases.indexOf(benchCase),
			},
		},
	);

	const runContext: BenchCaseRunContext = {
		signal,
		measureOptions: options.measureOptions ?? {},
		caseId: {
			file: options.file,
			conditionPath: unit.path,
			conditionTitles: unit.titles,
			caseTitle: benchCase.title,
		},

		round: turn,

		progress: (completed, total) => {
			scope.progress(completed, total);
		},
		attach: (body, mediaType, name) => {
			scope.attach(body, mediaType, name);
		},
		setCaseResult: (result) => {
			scope.data({
				kind: "case-execution",
				measure: condition.measure,
				caseTitle: benchCase.title,
				arm: options.arm ?? "shared",
				replicate: options.replicate ?? 0,
				result,
			});
		},
		setConditionResult: (result) => {
			conditionScope.data({
				kind: "condition-result",
				measure: condition.measure,
				conditionTitle: title,
				result,
			});
		},
	};

	let startedAt: number;

	const heartbeat = new PeriodicalTimer(() => {
		const elapsedMs = performance.now() - startedAt;
		scope.heartbeat(elapsedMs, `${(elapsedMs / 1000).toFixed(1)}s`);
	}, options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS_);

	try {
		for (const level of chain) {
			await level.beforeEach?.(signal);
		}

		startedAt = performance.now();
		heartbeat.start();

		await benchCase.run(
			runContext,
			...(condition.options?.additionalRunArgs ?? []),
		);

		for (const level of chain.toReversed()) {
			await level.afterEach?.(signal);
		}

		return true;
	} catch (error) {
		scope.fail(error);

		return false;
	} finally {
		heartbeat.stop();
	}
}
