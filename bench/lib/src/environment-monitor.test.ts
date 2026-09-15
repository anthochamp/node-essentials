import { describe, expect, it } from "vitest";

import {
	classifyEnvironment,
	EnvironmentMonitor,
	EnvironmentSample,
} from "./environment-monitor.js";

/** A series of `loads`, with every other metric held constant. */
function series_(loads: readonly number[]): EnvironmentSample[] {
	return loads.map((loadRatio, index) => ({
		at: index * 1000,
		loadRatio,
		frequencyRatio: null,
		temperatureC: null,
		parentCpuRatio: 0.01,
		childRssBytes: null,
	}));
}

function ramp_(from: number, to: number, count: number): number[] {
	return Array.from(
		{ length: count },
		(_, index) => from + ((to - from) * index) / (count - 1),
	);
}

function alternating_(low: number, high: number, count: number): number[] {
	return Array.from({ length: count }, (_, index) =>
		index % 2 === 0 ? low : high,
	);
}

describe("classifyEnvironment", () => {
	it("should stay silent on a flat series", () => {
		const verdict = classifyEnvironment(series_(Array<number>(12).fill(0.4)));

		expect(verdict.stability).toBe("stable");
		expect(verdict.diagnostics).toEqual([]);
	});

	it("should call a monotone ramp drifting, never unstable", () => {
		const verdict = classifyEnvironment(series_(ramp_(0.5, 0.9, 12)));

		expect(verdict.stability).toBe("drifting");
		expect(verdict.diagnostics).toHaveLength(1);
		expect(verdict.diagnostics[0]).toMatchObject({
			severity: "info",
			code: "environment-drift",
		});
	});

	it("should call an oscillation of the same amplitude unstable", () => {
		const verdict = classifyEnvironment(series_(alternating_(0.5, 0.9, 12)));

		expect(verdict.stability).toBe("unstable");
		expect(verdict.diagnostics[0]).toMatchObject({
			severity: "warning",
			code: "environment-unstable",
		});
	});

	it("should not call an oscillation that never crosses the threshold unstable", () => {
		const verdict = classifyEnvironment(series_(alternating_(0.1, 0.2, 12)));

		expect(verdict.stability).toBe("stable");
		expect(verdict.diagnostics).toEqual([]);
	});

	it("should treat a core dropping below its own best as throttling", () => {
		const samples = series_(Array<number>(12).fill(0.2)).map(
			(sample, index) => ({
				...sample,
				frequencyRatio: index % 2 === 0 ? 1 : 0.7,
			}),
		);

		const verdict = classifyEnvironment(samples);

		expect(verdict.stability).toBe("unstable");
		expect(verdict.diagnostics[0]).toMatchObject({
			attributes: { metric: "frequency" },
		});
	});

	it("should report a temperature climb as drift rather than instability", () => {
		const climb = ramp_(40, 70, 12);
		const samples = series_(Array<number>(12).fill(0.2)).map(
			(sample, index) => ({ ...sample, temperatureC: climb[index] ?? 0 }),
		);

		const verdict = classifyEnvironment(samples);

		expect(verdict.stability).toBe("drifting");
		expect(verdict.diagnostics[0]).toMatchObject({
			severity: "info",
			attributes: { metric: "temperature" },
		});
	});

	it("should ignore a series too short to judge", () => {
		expect(classifyEnvironment(series_([0.1, 0.9])).stability).toBe("stable");
	});
});

describe("EnvironmentMonitor", () => {
	it("should classify what it collected between start and stop", async () => {
		const loads = alternating_(0.5, 0.9, 12);
		let index = 0;

		const monitor = new EnvironmentMonitor(
			() =>
				Promise.resolve(
					series_([loads[index++ % loads.length] ?? 0])[0] as EnvironmentSample,
				),
			{ intervalMs: 0 },
		);

		monitor.start();
		await new Promise((resolve) => setTimeout(resolve, 30));
		const verdict = await monitor.stop();

		expect(verdict.samples.length).toBeGreaterThanOrEqual(3);
		expect(verdict.stability).toBe("unstable");
	});

	it("should be restartable, discarding the previous window", async () => {
		const monitor = new EnvironmentMonitor(
			() => Promise.resolve(series_([0.4])[0] as EnvironmentSample),
			{ intervalMs: 0 },
		);

		monitor.start();
		await new Promise((resolve) => setTimeout(resolve, 10));
		await monitor.stop();

		monitor.start();
		const verdict = await monitor.stop();

		expect(verdict.stability).toBe("stable");
	});
});
