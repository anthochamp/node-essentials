import os from "node:os";
import { setTimeout as delay } from "node:timers/promises";

import { ReportDiagnostic } from "@ac-kit/app-report";
import {
	readCpuFrequencyRatio,
	readMaxTemperatureC,
	readProcessRssBytes,
} from "@ac-kit/app-system";
import { mannKendallTrend, reversalRate } from "@ac-kit/math-stats";

/** One observation of everything a child process does not isolate. */
export type EnvironmentSample = {
	at: number;
	/** 1-minute load average divided by CPU count. */
	loadRatio: number;
	/** Mean of `scaling_cur_freq / cpuinfo_max_freq` across cores, when readable. */
	frequencyRatio: number | null;
	/** Hottest thermal zone in °C, when readable. */
	temperatureC: number | null;
	/** The parent's own CPU time in this interval, as a fraction of it. */
	parentCpuRatio: number;
	/** Resident set of the measuring child. */
	childRssBytes: number | null;
};

export type EnvironmentStability = "stable" | "drifting" | "unstable";

export type EnvironmentVerdict = {
	stability: EnvironmentStability;
	diagnostics: ReportDiagnostic[];
	samples: EnvironmentSample[];
};

/** Two-sided 5% normal deviate: the trend is real rather than sampling noise. */
const TREND_SIGNIFICANT_ = 1.96;

/** Above this fraction of reversals a series is oscillating, not drifting. */
const REVERSALS_UNSTABLE_ = 0.4;

/** Below this fraction a series is monotone enough to call a drift. */
const REVERSALS_DRIFTING_ = 0.25;

/** A core dropping this far below the run's own best is throttling. */
const FREQUENCY_FLOOR_ = 0.9;

/** Load per core above which the machine is contended. */
const LOAD_CONTENDED_ = 0.7;

/**
 * Classifies a scripted or collected series.
 *
 * A monotone ramp and an oscillation of the same amplitude look identical to a
 * variance threshold and mean completely different things, so the two tests are
 * separated: `mannKendallTrend` answers "is it going somewhere" and
 * `reversalRate` answers "does it keep changing its mind".
 */
export function classifyEnvironment(
	samples: readonly EnvironmentSample[],
): EnvironmentVerdict {
	const metrics = [
		{
			name: "load",
			values: samples.map((sample) => sample.loadRatio),
			unstable: (values: number[]) =>
				Math.min(...values) < LOAD_CONTENDED_ &&
				Math.max(...values) > LOAD_CONTENDED_,
		},
		{
			name: "frequency",
			values: definedValues_(samples, (sample) => sample.frequencyRatio),
			unstable: (values: number[]) =>
				Math.min(...values) < FREQUENCY_FLOOR_ * Math.max(...values),
		},
		{
			name: "temperature",
			values: definedValues_(samples, (sample) => sample.temperatureC),
			// Temperature climbs and does not oscillate; only its drift is meaningful.
			unstable: () => false,
		},
	];

	const diagnostics: ReportDiagnostic[] = [];
	let stability: EnvironmentStability = "stable";

	for (const metric of metrics) {
		if (metric.values.length < 3) {
			continue;
		}

		const reversals = reversalRate(metric.values);
		const { normalised } = mannKendallTrend(metric.values);
		const low = Math.min(...metric.values);
		const high = Math.max(...metric.values);

		if (reversals >= REVERSALS_UNSTABLE_ && metric.unstable(metric.values)) {
			stability = "unstable";
			diagnostics.push({
				severity: "warning",
				code: "environment-unstable",
				message: `${metric.name} oscillated between ${format_(low)} and ${format_(high)} during this measurement; the numbers are contended, not merely shifted`,
				attributes: { metric: metric.name, low, high, reversals },
			});
			continue;
		}

		if (
			Math.abs(normalised) >= TREND_SIGNIFICANT_ &&
			reversals <= REVERSALS_DRIFTING_
		) {
			if (stability === "stable") {
				stability = "drifting";
			}

			diagnostics.push({
				severity: "info",
				code: "environment-drift",
				message: `${metric.name} drifted ${normalised > 0 ? "up" : "down"} from ${format_(metric.values[0] ?? 0)} to ${format_(metric.values[metric.values.length - 1] ?? 0)} during this measurement`,
				attributes: { metric: metric.name, low, high, normalised },
			});
		}
	}

	// A clean run stays quiet.
	return { stability, diagnostics, samples: [...samples] };
}

export type EnvironmentProbe = () => Promise<EnvironmentSample>;

export type EnvironmentMonitorOptions = {
	readonly intervalMs?: number;
};

const DEFAULT_INTERVAL_MS_ = 1000;

/**
 * Samples the machine while a child measures, and judges what it saw.
 *
 * The parent is idle during a measurement, which makes it the only process in a
 * position to watch the things a fork cannot isolate.
 */
export class EnvironmentMonitor {
	private readonly intervalMs: number;
	private samples: EnvironmentSample[] = [];
	private controller: AbortController | null = null;
	private loop: Promise<void> | null = null;

	constructor(
		private readonly probe: EnvironmentProbe,
		options?: EnvironmentMonitorOptions,
	) {
		this.intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS_;
	}

	start(): void {
		if (this.controller !== null) {
			return;
		}

		this.samples = [];
		this.controller = new AbortController();
		this.loop = this.collect(this.controller.signal);
	}

	/** Stops sampling and classifies everything collected since `start()`. */
	async stop(): Promise<EnvironmentVerdict> {
		this.controller?.abort();
		await this.loop;

		this.controller = null;
		this.loop = null;

		return classifyEnvironment(this.samples);
	}

	private async collect(signal: AbortSignal): Promise<void> {
		while (!signal.aborted) {
			try {
				this.samples.push(await this.probe());
				await delay(this.intervalMs, undefined, { signal });
			} catch {
				// An unreadable metric or an aborted wait ends the watch, never the run.
				return;
			}
		}
	}
}

export type NodeEnvironmentProbeOptions = {
	/** Resolved per sample, because the child outlives no single one of them. */
	readonly pidOf?: () => number | undefined;
};

/** Reads the host metrics this platform exposes; unreadable ones are `null`. */
export function nodeEnvironmentProbe(
	options?: NodeEnvironmentProbeOptions,
): EnvironmentProbe {
	const cpuCount = Math.max(1, os.cpus().length);
	let lastCpu = process.cpuUsage();
	let lastAt = Date.now();

	return async () => {
		const at = Date.now();
		const cpu = process.cpuUsage();
		const elapsedUs = Math.max(1, (at - lastAt) * 1000);
		const usedUs = cpu.user - lastCpu.user + (cpu.system - lastCpu.system);

		lastCpu = cpu;
		lastAt = at;

		const [frequencyRatio, temperatureC, childRssBytes] = await Promise.all([
			readCpuFrequencyRatio(),
			readMaxTemperatureC(),
			readChildRss_(options?.pidOf?.()),
		]);

		return {
			at,
			loadRatio: (os.loadavg()[0] ?? 0) / cpuCount,
			frequencyRatio,
			temperatureC,
			parentCpuRatio: usedUs / elapsedUs,
			childRssBytes,
		};
	};
}

function readChildRss_(pid: number | undefined): Promise<number | null> {
	return pid === undefined ? Promise.resolve(null) : readProcessRssBytes(pid);
}

function definedValues_(
	samples: readonly EnvironmentSample[],
	pick: (sample: EnvironmentSample) => number | null,
): number[] {
	return samples
		.map((sample) => pick(sample))
		.filter((value) => value !== null);
}

function format_(value: number): string {
	return value.toFixed(2);
}
