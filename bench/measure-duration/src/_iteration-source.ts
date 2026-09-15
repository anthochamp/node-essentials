import { fileURLToPath } from "node:url";

import { BenchCaseId } from "@ac-bench/core/runner";

import { iterationPayloadSchema } from "./_iteration-protocol.js";
import {
	ColdStartPhases,
	IterationOutcome,
	ProcessGroup,
} from "./_process-execution.js";
import { SpawnBaselineReport } from "./_spawn-baseline.js";
import { DurationStatistics } from "./_statistics-schema.js";
import { summarise } from "./_statistics.js";
import { DurationCommandCaseOptions } from "./options.js";

/** Command a case executes once per iteration, with its do-nothing counterpart. */
export type IterationCommand = {
	readonly command: string;
	readonly args: readonly string[];
	/** Invocation that starts the same program and does nothing, when known. */
	readonly baselineArgs: readonly string[] | null;
	readonly capturePhases: boolean;
	readonly cwd?: string;
	readonly env?: Readonly<Record<string, string>>;
};

/**
 * Resolves what to execute for `execution: "per-iteration-process"`.
 *
 * The spawned process re-imports the bench file and replays the case identity,
 * so it must be started by the same interpreter with the same loader flags — a
 * bench file that only a TypeScript loader can import is the normal case, not
 * the exception.
 */
export function iterationProcessCommand(caseId: BenchCaseId): IterationCommand {
	const payload = JSON.stringify(
		iterationPayloadSchema.parse({
			file: caseId.file,
			conditionPath: [...caseId.conditionPath],
			conditionTitles: [...caseId.conditionTitles],
			caseTitle: caseId.caseTitle,
		}),
	);

	return {
		command: process.execPath,
		args: [...process.execArgv, iterationChildPath_(), payload],
		// Same interpreter and same loader, without the bench file: everything
		// this execution mode exists to measure, and nothing else.
		baselineArgs: [...process.execArgv, "-e", ""],
		capturePhases: true,
	};
}

/** Resolves what to execute for a `durationCommandCase`. */
export function commandCaseCommand(
	command: string,
	args: readonly string[],
	options: DurationCommandCaseOptions | undefined,
): IterationCommand {
	return {
		command,
		args,
		baselineArgs: options?.baselineArgs ? [...options.baselineArgs] : null,
		capturePhases: false,
		...(options?.cwd === undefined ? {} : { cwd: options.cwd }),
		...(options?.env === undefined ? {} : { env: options.env }),
	};
}

/**
 * Runs one iteration and returns its wall time.
 *
 * @throws {Error} If the process failed, with its stderr tail attached — an
 *   exit code on its own is undiagnosable, and a failing program is the most
 *   likely thing to go wrong in this execution mode.
 */
export async function measureIteration(
	group: ProcessGroup,
	command: IterationCommand,
	phases: ColdStartPhases[],
	signal: AbortSignal,
): Promise<number> {
	const outcome = await group.run(
		command.command,
		command.args,
		{
			capturePhases: command.capturePhases,
			...(command.cwd === undefined ? {} : { cwd: command.cwd }),
			...(command.env === undefined ? {} : { env: command.env }),
		},
		signal,
	);

	if (outcome.exitCode !== 0) {
		throw new Error(describeFailure_(command, outcome));
	}

	if (outcome.phases !== null) {
		phases.push(outcome.phases);
	}

	return outcome.wallMs;
}

/**
 * Measures what starting the program costs when it is asked to do nothing.
 *
 * Measured once per case rather than once per condition: a condition's cases
 * routinely spawn different programs, or none at all, and one program's
 * start-up cost is not another's.
 *
 * @param group Owns the spawned processes, so none outlives the case.
 * @param command What the case executes, including its do-nothing arguments.
 * @param counts Warm-up and measured invocation counts.
 * @param signal Cancellation.
 * @returns Statistics over the measured invocations, or `null` when the case
 *   declared no do-nothing invocation.
 */
export async function measureSpawnBaseline(
	group: ProcessGroup,
	command: IterationCommand,
	counts: { readonly warmup: number; readonly runs: number },
	signal: AbortSignal,
): Promise<DurationStatistics | null> {
	if (command.baselineArgs === null) {
		return null;
	}

	const baseline: IterationCommand = {
		...command,
		args: command.baselineArgs,
		baselineArgs: null,
		capturePhases: false,
	};

	const discard: ColdStartPhases[] = [];

	for (let iteration = 0; iteration < counts.warmup; iteration++) {
		await measureIteration(group, baseline, discard, signal);
	}

	const samples: number[] = [];

	for (let iteration = 0; iteration < counts.runs; iteration++) {
		samples.push(await measureIteration(group, baseline, discard, signal));
	}

	return summarise(samples);
}

/**
 * Assembles the reported baseline block.
 *
 * @param command What the case executes.
 * @param statistics Baseline statistics, or `null` when none was measured.
 * @param caseMedianMs The case's own median, for the share.
 * @param subtracted Whether the baseline fed the `adjusted` figure.
 */
export function spawnBaselineReport(
	command: IterationCommand,
	statistics: DurationStatistics | null,
	caseMedianMs: number,
	subtracted: boolean,
): SpawnBaselineReport | null {
	if (statistics === null) {
		return null;
	}

	return {
		command: [command.command, ...(command.baselineArgs ?? [])].join(" "),
		statistics,
		share: caseMedianMs > 0 ? statistics.medianMs / caseMedianMs : 1,
		subtracted,
	};
}

/** Median of each phase, so one cold start's noise does not stand for all. */
export function summariseColdStart(
	phases: readonly ColdStartPhases[],
): ColdStartPhases | null {
	if (phases.length === 0) {
		return null;
	}

	return {
		startupMs: summarise(phases.map((phase) => phase.startupMs)).medianMs,
		importMs: summarise(phases.map((phase) => phase.importMs)).medianMs,
		runMs: summarise(phases.map((phase) => phase.runMs)).medianMs,
	};
}

function describeFailure_(
	command: IterationCommand,
	outcome: IterationOutcome,
): string {
	const how =
		outcome.terminatedBy === null
			? `exited with code ${outcome.exitCode}`
			: `was terminated by ${outcome.terminatedBy}`;
	const invocation = [command.command, ...command.args.slice(0, 2)].join(" ");
	const tail =
		outcome.stderrTail === "" ? "" : `\n${outcome.stderrTail.trimEnd()}`;

	return `${invocation} ${how}${tail}`;
}

function iterationChildPath_(): string {
	return fileURLToPath(
		import.meta.resolve("@ac-bench/measure-duration/iteration-child"),
	);
}
