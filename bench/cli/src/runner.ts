import { pathToFileURL } from "node:url";

import { partitionPlugins } from "@ac-bench/core/plugin";
import { runBench } from "@ac-bench/lib";
import { formatError } from "@ac-kit/core";
import { walkPaths } from "@ac-kit/node";

import { BenchConfig } from "./config.js";
import { BenchMode, resolveMeasurementPlan } from "./mode.js";
import { resolveReporterPlugins } from "./resolve-reporter-plugins.js";

/** Applied when neither the command line nor the config file names any. */
const DEFAULT_INCLUDE = ["**/*.bench.ts"];
// Matches the directory itself, at any depth, so the walk never enters it.
const DEFAULT_EXCLUDE = ["**/node_modules"];
const DEFAULT_REPORTERS = ["table"];
const DEFAULT_OUTPUT = "bench-results";

/** Load a config file by path (must default-export a BenchConfig). */
export async function loadConfig(configPath: string): Promise<BenchConfig> {
	const url = pathToFileURL(configPath).href;
	const mod = (await import(url)) as { default?: BenchConfig };
	return mod.default ?? {};
}

/** CLI overrides from Commander flags. */
export interface CliOverrides {
	include?: string[];
	exclude?: string[];
	/**
	 * Case-insensitive substring patterns matched against a condition's title or
	 * a case's name.
	 */
	filter?: string[];
	/** Ids of the reporters to run, overriding the config file's list. */
	reporters?: string[];
	/** Output base name (without extension) for file reporters. */
	output?: string;
	/** Print discovered conditions/cases without running them. */
	list?: boolean;
	/**
	 * How much rigour the run should apply.
	 *
	 * The only rigour control on the CLI: replicate counts, isolated runs,
	 * cooldown gating and retries are all mechanism, and live in the config file
	 * for the rare run that needs to pin them exactly.
	 */
	mode?: BenchMode;
	/** Reproduces one run's replicate and case orderings exactly. */
	orderSeed?: number;
	/** Wall-clock cap on the whole run, in milliseconds. */
	maxTotalTime?: number;
	/** Attach each case's raw samples to its scope. */
	emitSamples?: boolean;
	/** Show every child's output as it happens, and full stack traces. */
	verbose?: boolean;
}

/**
 * Resolves flags and config into run parameters, then hands them to the
 * programmatic API.
 *
 * Exits with status 1 when the include patterns match nothing: a run that
 * measured nothing is a mistake to report, not an empty result to hand back.
 */
export async function runAll(
	config: BenchConfig,
	cli: CliOverrides,
	signal: AbortSignal,
): Promise<void> {
	const include = cli.include ?? config.include ?? DEFAULT_INCLUDE;
	const exclude = cli.exclude ?? config.exclude ?? DEFAULT_EXCLUDE;

	if (cli.verbose === true) {
		// Set once rather than threaded through every `formatError` call site: the
		// switch is run-wide, and nothing in a bench run wants the short form while
		// the user is asking to see everything.
		formatError.defaultOptions.stackTrace = true;
	}

	const files = await Array.fromAsync(
		walkPaths({
			include: include.length > 0 ? include : DEFAULT_INCLUDE,
			exclude: exclude.length > 0 ? exclude : DEFAULT_EXCLUDE,
			root: process.cwd(),
			descend: true,
			signal,
		}),
		(walked) => walked.path,
	);

	if (files.length === 0) {
		process.stderr.write(
			"measure: no files found. Use --include to specify patterns.\n",
		);
		process.exit(1);
	}

	const { measures, reporters: configuredReporters } = partitionPlugins(
		config.plugins ?? [],
	);

	await runBench({
		files,
		measures,
		reporters: resolveReporterPlugins(
			cli.reporters ?? config.reporters ?? DEFAULT_REPORTERS,
			configuredReporters,
		),
		output: cli.output ?? config.output ?? DEFAULT_OUTPUT,
		plan: resolveMeasurementPlan(
			cli.mode ?? config.mode,
			config.measurementPlan,
		),
		orderSeed: cli.orderSeed ?? config.orderSeed ?? Date.now() | 0,
		signal,
		maxTotalTimeMs: cli.maxTotalTime ?? config.maxTotalTimeMs ?? 0,
		...(cli.filter ? { filter: cli.filter } : {}),
		...(cli.list === true ? { list: true } : {}),
		...(cli.emitSamples ? { emitSamples: true } : {}),
		...(cli.verbose ? { verbose: true } : {}),
		...(config.setupFiles ? { setupFiles: config.setupFiles } : {}),
		...(config.heartbeatTimeoutMs !== undefined
			? { heartbeatTimeoutMs: config.heartbeatTimeoutMs }
			: {}),
		...(config.conditionTimeoutMs !== undefined
			? { conditionTimeoutMs: config.conditionTimeoutMs }
			: {}),
	});
}
