import { isNodeErrorWithCode, spawnProcess } from "@ac-kit/node";

import { DurationStatistics } from "./_statistics-schema.js";
import { summarise } from "./_statistics.js";

export interface SpawnOverheadOptions {
	/** Unmeasured invocations run first. Defaults to 3. */
	warmup?: number;

	/** Measured invocations. Defaults to 20. */
	runs?: number;
}

/**
 * The do-nothing equivalent of a command being benchmarked.
 *
 * To subtract spawn cost honestly, this must start the same binary and do the
 * same unavoidable setup as the real command, minus the work under test. For
 * `python3 -c "<protocol code>"` the right baseline is `python3 -c "import
 * smtplib"`, not `python3 --version`: interpreter startup is only part of the
 * cost, module import is the rest.
 */
export interface SpawnBaseline {
	/** Label used in reports, and matched against a case's `tags.language`. */
	name: string;

	/** Executable to run. Resolved on `PATH`; never passed through a shell. */
	command: string;

	/** Arguments producing the cheapest meaningful invocation. */
	args?: readonly string[];
}

/**
 * Measure how long it takes to start and stop a command that does nothing.
 *
 * A benchmark that spawns a process per iteration includes this cost in every
 * sample, while an in-process contender pays none of it. Measuring it makes the
 * bias visible and lets reports show an adjusted figure.
 *
 * @param command Executable to run. Resolved on `PATH`; never passed through a
 *   shell.
 * @param args Arguments producing the cheapest meaningful invocation.
 * @param options Sampling policy.
 * @returns Statistics over the measured invocations.
 * @throws {Error} If the command cannot be executed at all.
 */
export async function measureSpawnOverhead(
	command: string,
	args: readonly string[],
	options?: SpawnOverheadOptions,
): Promise<DurationStatistics> {
	const warmup = options?.warmup ?? 3;
	const runs = options?.runs ?? 20;

	for (let iteration = 0; iteration < warmup; iteration++) {
		await invoke_(command, args);
	}

	const samples: number[] = [];

	for (let iteration = 0; iteration < runs; iteration++) {
		const began = performance.now();
		await invoke_(command, args);
		samples.push(performance.now() - began);
	}

	return summarise(samples);
}

/**
 * Floor cost of spawning any process from this runtime.
 *
 * Useful as a sanity check: a per-binary overhead below this value means the
 * measurement is noise.
 *
 * @param options Sampling policy.
 * @returns Statistics for the cheapest process the platform can start.
 */
export function measureBaselineSpawn(
	options: SpawnOverheadOptions = {},
): Promise<DurationStatistics> {
	return process.platform === "win32"
		? measureSpawnOverhead("cmd", ["/c", "exit"], options)
		: measureSpawnOverhead("true", [], options);
}

/**
 * Measure spawn overhead for several commands.
 *
 * @param baselines One entry per binary used by the condition.
 * @param options Sampling policy applied to each.
 * @returns Overheads keyed by {@link SpawnBaseline.name}. A command that cannot
 *   be executed is omitted rather than failing the calibration.
 */
export async function calibrateSpawnOverhead(
	baselines: readonly SpawnBaseline[],
	options?: SpawnOverheadOptions,
): Promise<Map<string, DurationStatistics>> {
	const overheads = new Map<string, DurationStatistics>();
	for (const baseline of baselines) {
		try {
			overheads.set(
				baseline.name,
				await measureSpawnOverhead(
					baseline.command,
					baseline.args ?? [],
					options,
				),
			);
		} catch {
			// An unavailable binary is reported by its own benchmark case.
		}
	}
	return overheads;
}

/**
 * Runs `command`, tolerating a nonzero exit — the process still started and
 * stopped, which is what spawn-overhead measurement cares about.
 */
async function invoke_(
	command: string,
	args: readonly string[],
): Promise<void> {
	try {
		await spawnProcess(command, args);
	} catch (error) {
		if (isNodeErrorWithCode(error, "ENOENT")) {
			throw new Error(`Command not found: ${command}`);
		}
		// A non-zero exit is acceptable; the process still started and stopped.
	}
}
