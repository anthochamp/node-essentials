import { randomUUID } from "node:crypto";

import type { MeasurePlugin, ReporterPlugin } from "@ac-bench/core/plugin";
import { MeasureRegistry } from "@ac-bench/core/plugin";
import type { DiscoveredCondition } from "@ac-bench/core/runner";
import { createFanOutSink, TailWindowProxy } from "@ac-kit/app-report";
import type { Terminal } from "@ac-kit/app-terminal";
import { formatError } from "@ac-kit/core";

import { captureEnvironmentBaseline, CooldownGate } from "./cooldown.js";
import {
	EnvironmentMonitor,
	nodeEnvironmentProbe,
} from "./environment-monitor.js";
import { discoverConditionsInFile } from "./fork-runner.js";
import {
	defaultArtifactCacheRoot,
	IsolatedRunOptions,
	runFileIsolated,
	toForkOptions,
} from "./isolated-runner.js";
import { createMeasureDiagnosticProxy } from "./measure-diagnostic-proxy.js";
import { MeasurementPlan } from "./measurement-plan.js";
import { createReporterContext } from "./reporter-context.js";

/** Settle window before the first measurement, when cooling is on. */
const BASELINE_WINDOW_MS = 3000;

/** Per gate, and across the whole run. Exhausting either proceeds anyway. */
const MAX_COOLDOWN_MS = 30_000;
const TOTAL_COOLDOWN_BUDGET_MS = 300_000;

/**
 * Everything a run needs, already resolved.
 *
 * Nothing here is an intent: naming one (`--mode rigorous`, a reporter id, a
 * glob) and turning it into these values is configuration, and belongs to
 * whoever parses it.
 */
export type BenchRunOptions = {
	/** Bench files to run, already discovered. */
	readonly files: readonly string[];
	/** Registered for the measures `files` declare conditions for. */
	readonly measures: readonly MeasurePlugin[];
	/** Every reporter the run reports to; each sink is closed when it ends. */
	readonly reporters: readonly ReporterPlugin[];
	/** Base name for output files, for a reporter given no explicit one. */
	readonly output: string;
	/** How many contexts each condition is measured in. */
	readonly plan: MeasurementPlan;
	/** Seeds the replicate and case orderings. */
	readonly orderSeed: number;
	readonly signal: AbortSignal;
	/** Case-insensitive substring patterns, matched on a case or condition title. */
	readonly filter?: readonly string[];
	/** Print each file's condition tree instead of measuring anything. */
	readonly list?: boolean;
	/** Imported by every child before the bench file, in order. */
	readonly setupFiles?: readonly string[];
	/** Attach each case's raw samples, which are copied across the boundary. */
	readonly emitSamples?: boolean;
	/**
	 * Report every child's output as it happens. Off, a child's output reaches
	 * the reporters only for a scope that ended badly.
	 */
	readonly verbose?: boolean;
	readonly heartbeatTimeoutMs?: number;
	/** Wall-clock cap on one fork unit. `0` disables it. */
	readonly conditionTimeoutMs?: number;
	/** Wall-clock cap on the whole run, cooldown included. `0` disables it. */
	readonly maxTotalTimeMs?: number;
	/** Defaults to `process.stdout`; an override exists for tests. */
	readonly stdout?: WritableStream<string>;
	/** Defaults to whatever `process.stdout` reports. */
	readonly terminal?: Terminal;
};

/**
 * Discovers every bench file's condition tree in a child of its own, then runs
 * each fork unit in a child of its own, closing every sink once the last one
 * finishes.
 *
 * When `signal` aborts, the in-flight child is terminated, every condition not
 * yet started is skipped, and the sinks are still closed.
 *
 * A file that fails to load is reported to `stderr` as a `load-error` and
 * skipped — the run continues with the next file rather than crashing over one
 * broken bench file.
 */
export async function runBench(options: BenchRunOptions): Promise<void> {
	const registry = new MeasureRegistry();
	for (const plugin of options.measures) {
		registry.register(plugin);
	}

	const reporterContext = createReporterContext({
		registry,
		defaultOutput: options.output,
		...(options.verbose ? { verbose: true } : {}),
		...(options.stdout ? { stdout: options.stdout } : {}),
		...(options.terminal ? { terminal: options.terminal } : {}),
	});

	const reported = createFanOutSink(
		options.reporters.map((reporter) => reporter.createSink(reporterContext)),
	);

	const sink = createMeasureDiagnosticProxy(
		// A healthy child's chatter is noise; the same chatter from a child that
		// died is the only account of what it was doing. Only `output` is held
		// back — every other kind is the report itself.
		options.verbose
			? reported
			: new TailWindowProxy(reported, {
					alwaysForwardKinds: [
						"scope-start",
						"scope-attributes",
						"scope-progress",
						"scope-heartbeat",
						"scope-end",
						"diagnostic",
						"attachment",
						"data",
					],
				}),
		registry,
	);

	// One measuring child exists at a time, so one slot is enough to point the
	// probe at whichever one is currently running.
	const measuringChild: { pid: number | undefined } = { pid: undefined };
	const probe = nodeEnvironmentProbe({ pidOf: () => measuringChild.pid });

	const maxTotalTimeMs = options.maxTotalTimeMs ?? 0;
	const { plan } = options;
	// One signal for both reasons, so every existing abort check honours the
	// budget too; the two are told apart afterwards for the exit code.
	const budget =
		maxTotalTimeMs > 0 ? AbortSignal.timeout(maxTotalTimeMs) : null;
	const runSignal =
		budget === null
			? options.signal
			: AbortSignal.any([options.signal, budget]);

	const runOptions: IsolatedRunOptions = {
		sink,
		registry,
		signal: runSignal,
		runId: randomUUID(),
		artifactCacheRoot: defaultArtifactCacheRoot(),
		monitor: new EnvironmentMonitor(probe),
		plan,
		orderSeed: options.orderSeed,
		retryOnInstability: plan.retryOnInstability,
		onChildPid: (pid) => {
			measuringChild.pid = pid;
		},
		...(options.filter ? { filter: options.filter } : {}),
		...(options.emitSamples ? { emitSamples: true } : {}),
		...(options.setupFiles ? { setupFiles: options.setupFiles } : {}),
		...(options.heartbeatTimeoutMs !== undefined
			? { heartbeatTimeoutMs: options.heartbeatTimeoutMs }
			: {}),
		...(options.conditionTimeoutMs !== undefined
			? { conditionTimeoutMs: options.conditionTimeoutMs }
			: {}),
		...(plan.cooldown
			? {
					cooldown: new CooldownGate(
						probe,
						await captureEnvironmentBaseline(
							probe,
							BASELINE_WINDOW_MS,
							500,
							runSignal,
						),
						{
							maxCooldownMs: MAX_COOLDOWN_MS,
							totalBudgetMs: TOTAL_COOLDOWN_BUDGET_MS,
						},
					),
				}
			: {}),
	};

	for (const file of options.files) {
		if (runSignal.aborted) {
			break;
		}

		if (options.list === true) {
			await listFile_(file, runOptions);
			continue;
		}

		await runFileIsolated(file, runOptions);
	}

	if (budget?.aborted === true && !options.signal.aborted) {
		await sink.write({
			kind: "diagnostic",
			timestamp: Date.now(),
			scopeId: null,
			severity: "warning",
			code: "max-total-time-exhausted",
			message: `the run was stopped after its ${maxTotalTimeMs}ms budget; some conditions were never measured`,
		});
	}

	await sink.close();
}

/** Prints a discovered condition tree in declaration order, running nothing. */
function listCondition_(
	condition: DiscoveredCondition,
	registry: MeasureRegistry,
	depth: number,
): void {
	const indent = "  ".repeat(depth);
	const { label } = registry.resolve(condition.measure);

	process.stdout.write(`${indent}${condition.title} (${label})\n`);

	for (const entry of condition.entries) {
		if (entry.kind === "case") {
			process.stdout.write(`${indent}  ${entry.title}\n`);
		} else {
			listCondition_(entry.condition, registry, depth + 1);
		}
	}
}

async function listFile_(
	file: string,
	options: IsolatedRunOptions,
): Promise<void> {
	let conditions: DiscoveredCondition[];

	try {
		conditions = await discoverConditionsInFile(file, toForkOptions(options));
	} catch (error) {
		process.stderr.write(
			`measure: failed to load ${file}: ${formatError(error)}\n`,
		);
		return;
	}

	for (const condition of conditions) {
		listCondition_(condition, options.registry, 0);
	}
}
