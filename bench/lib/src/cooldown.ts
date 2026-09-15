import { setTimeout as delay } from "node:timers/promises";

import { ReportDiagnostic } from "@ac-kit/app-report";
import { mannKendallTrend } from "@ac-kit/math-stats";

import { EnvironmentProbe, EnvironmentSample } from "./environment-monitor.js";

/** What the machine looked like before any measurement ran. */
export type EnvironmentBaseline = {
	loadRatio: number;
	frequencyRatio: number | null;
	temperatureC: number | null;
};

export type CooldownOptions = {
	/** Per gate. `0` disables cooling entirely. */
	readonly maxCooldownMs: number;
	/** Across the whole run. Exhausting it proceeds rather than hangs. */
	readonly totalBudgetMs: number;
	/** Degrees above baseline that still count as settled. Default 2. */
	readonly temperatureToleranceC?: number;
	/**
	 * Fraction of the baseline frequency that still counts as settled. Default
	 * 0.98.
	 */
	readonly frequencyTolerance?: number;
	/** Default 500. */
	readonly intervalMs?: number;
};

export type CooldownResult = {
	/** Time spent waiting. Not measurement time, so it is reported separately. */
	cooldownMs: number;
	diagnostics: ReportDiagnostic[];
};

/** Samples over `windowMs` are the reference every later gate compares against. */
export async function captureEnvironmentBaseline(
	probe: EnvironmentProbe,
	windowMs: number,
	intervalMs = 500,
	signal?: AbortSignal,
): Promise<EnvironmentBaseline> {
	const samples: EnvironmentSample[] = [];
	const until = Date.now() + windowMs;

	while (Date.now() < until && signal?.aborted !== true) {
		samples.push(await probe());

		try {
			await delay(intervalMs, undefined, signal ? { signal } : undefined);
		} catch {
			break;
		}
	}

	return {
		loadRatio: median_(samples.map((sample) => sample.loadRatio)) ?? 0,
		frequencyRatio: median_(
			samples
				.map((sample) => sample.frequencyRatio)
				.filter((value) => value !== null),
		),
		temperatureC: median_(
			samples
				.map((sample) => sample.temperatureC)
				.filter((value) => value !== null),
		),
	};
}

/**
 * Waits between fork units until the machine stops recovering, never inside a
 * timed case.
 *
 * Waiting is preventive where retrying is corrective: it avoids paying for a
 * bad measurement rather than noticing one afterwards. The stopping rule is the
 * _derivative_, not the baseline — ambient conditions may simply have changed,
 * so waiting for the exact starting temperature would never terminate.
 */
export class CooldownGate {
	private spentMs = 0;

	constructor(
		private readonly probe: EnvironmentProbe,
		private readonly baseline: EnvironmentBaseline,
		private readonly options: CooldownOptions,
	) {}

	/** Time already spent cooling across every gate so far. */
	get totalCooldownMs(): number {
		return this.spentMs;
	}

	async settle(signal?: AbortSignal): Promise<CooldownResult> {
		const budget = Math.min(
			this.options.maxCooldownMs,
			Math.max(0, this.options.totalBudgetMs - this.spentMs),
		);

		if (budget === 0) {
			return { cooldownMs: 0, diagnostics: [] };
		}

		const intervalMs = this.options.intervalMs ?? 500;
		const startedAt = Date.now();
		const recent: number[] = [];
		let settled = false;

		while (Date.now() - startedAt < budget && signal?.aborted !== true) {
			const sample = await this.probe();

			if (this.isSettled_(sample)) {
				settled = true;
				break;
			}

			recent.push(sample.temperatureC ?? sample.loadRatio);

			// Stop once the recovery has flattened: the trend, not the level.
			if (recent.length >= 5) {
				const { normalised } = mannKendallTrend(recent.slice(-5));

				if (normalised > -1.96) {
					settled = true;
					break;
				}
			}

			try {
				await delay(intervalMs, undefined, signal ? { signal } : undefined);
			} catch {
				break;
			}
		}

		const cooldownMs = Date.now() - startedAt;
		this.spentMs += cooldownMs;

		return {
			cooldownMs,
			diagnostics: settled
				? []
				: [
						{
							severity: "info",
							code: "cooldown-budget-exhausted",
							message: `waited ${cooldownMs}ms without the machine settling; measuring anyway`,
							attributes: { cooldownMs },
						},
					],
		};
	}

	private isSettled_(sample: EnvironmentSample): boolean {
		const temperatureTolerance = this.options.temperatureToleranceC ?? 2;
		const frequencyTolerance = this.options.frequencyTolerance ?? 0.98;

		const hot =
			this.baseline.temperatureC !== null &&
			sample.temperatureC !== null &&
			sample.temperatureC > this.baseline.temperatureC + temperatureTolerance;

		const throttled =
			this.baseline.frequencyRatio !== null &&
			sample.frequencyRatio !== null &&
			sample.frequencyRatio < this.baseline.frequencyRatio * frequencyTolerance;

		return !hot && !throttled;
	}
}

function median_(values: readonly number[]): number | null {
	if (values.length === 0) {
		return null;
	}

	const sorted = [...values].toSorted((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
}
