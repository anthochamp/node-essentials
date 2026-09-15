/**
 * Measure CLI entry point.
 *
 * Invoked via `bin/measure.js`, which registers tsx before importing this
 * module.
 */
import { Command, InvalidArgumentError } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { BenchMode, benchModeSchema } from "./mode.js";
import type { CliOverrides } from "./runner.js";
import { loadConfig, runAll } from "./runner.js";

const program = new Command("measure")
	.description(
		"Discover and run TypeScript benchmark, latency, and timing files",
	)
	.version(packageJson.version)
	.option("-c, --config <path>", "Path to bench config file")
	.option(
		"--include <pattern>",
		"Glob pattern for bench files (repeatable)",
		collect,
		[] as string[],
	)
	.option(
		"--exclude <pattern>",
		"Glob pattern to exclude (repeatable)",
		collect,
		[] as string[],
	)
	.option(
		"--filter <pattern>",
		"Only run conditions/cases whose title/name contains this substring (repeatable)",
		collect,
		[] as string[],
	)
	.option("--list", "List discovered conditions and cases without running them")
	.option("--dry-run", "Alias for --list")
	.option(
		"--reporter <type>",
		"Reporter to use: table, json, markdown, csv (repeatable)",
		collect,
		[] as string[],
	)
	.option("--output <path>", "Output base name for file reporters")
	.option(
		"--mode <mode>",
		"How much rigour to apply: quick, standard or rigorous",
		parseMode,
	)
	.option(
		"--order-seed <n>",
		"Reproduce a run's replicate and case ordering exactly",
		parseIntArg,
	)
	.option(
		"--max-total-time <ms>",
		"Stop the run after this many milliseconds, retries and cooldown included",
		parseIntArg,
	)
	.option(
		"--emit-samples",
		"Attach every case's raw samples; they are copied across the process boundary",
	)
	.option(
		"--verbose",
		"Show every benchmark child's output as it happens, and full stack traces",
	);

program.action(async () => {
	const opts = program.opts<{
		config?: string;
		include: string[];
		exclude: string[];
		filter: string[];
		list?: boolean;
		dryRun?: boolean;
		reporter: string[];
		output?: string;
		mode?: BenchMode;
		orderSeed?: number;
		maxTotalTime?: number;
		emitSamples?: boolean;
		verbose?: boolean;
	}>();

	const config = opts.config ? await loadConfig(opts.config) : {};

	const cli: CliOverrides = {
		...(opts.include.length > 0 ? { include: opts.include } : {}),
		...(opts.exclude.length > 0 ? { exclude: opts.exclude } : {}),
		...(opts.filter.length > 0 ? { filter: opts.filter } : {}),
		...(opts.reporter.length > 0 ? { reporters: opts.reporter } : {}),
		...(opts.output !== undefined ? { output: opts.output } : {}),
		...(opts.list || opts.dryRun ? { list: true } : {}),
		...(opts.mode !== undefined ? { mode: opts.mode } : {}),
		...(opts.orderSeed !== undefined ? { orderSeed: opts.orderSeed } : {}),
		...(opts.maxTotalTime !== undefined
			? { maxTotalTime: opts.maxTotalTime }
			: {}),
		...(opts.emitSamples ? { emitSamples: true } : {}),
		...(opts.verbose ? { verbose: true } : {}),
	};

	const controller = new AbortController();
	process.once("SIGINT", () => {
		process.stderr.write(
			"\nmeasure: interrupted, finishing in-flight condition…\n",
		);
		controller.abort();
	});

	await runAll(config, cli, controller.signal);

	if (controller.signal.aborted) {
		process.exitCode = 130;
	}
});

await program.parseAsync(process.argv);

function collect(value: string, previous: string[]): string[] {
	return [...previous, value];
}

function parseIntArg(value: string): number {
	const parsed = Number.parseInt(value, 10);

	if (Number.isNaN(parsed)) {
		// Commander turns this one into a usage message; a plain Error would reach
		// the user as a stack trace over a typo.
		throw new InvalidArgumentError(`Expected an integer, got: ${value}`);
	}

	return parsed;
}

function parseMode(value: string): BenchMode {
	return benchModeSchema.parse(value);
}
