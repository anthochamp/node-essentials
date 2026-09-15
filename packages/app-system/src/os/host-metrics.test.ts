import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createTempDir } from "@ac-kit/node";
import { afterEach, beforeEach, expect, suite, test } from "vitest";

import {
	readCpuFrequencyRatio,
	readMaxTemperatureC,
	readProcessRssBytes,
} from "./host-metrics.js";
import {
	sysfsCpuFrequencyRatios,
	sysfsThermalZoneTemperaturesC,
} from "./sysfs.js";

suite("sysfs host metrics", () => {
	let sysfsRoot: string;

	beforeEach(async () => {
		sysfsRoot = await createTempDir("sysfs-test");
	});

	afterEach(async () => {
		await rm(sysfsRoot, { recursive: true, force: true });
	});

	async function writeCpu(
		name: string,
		nodes: Readonly<Record<string, string>>,
	): Promise<void> {
		const cpufreq = join(sysfsRoot, "devices/system/cpu", name, "cpufreq");
		await mkdir(cpufreq, { recursive: true });
		for (const [node, value] of Object.entries(nodes)) {
			await writeFile(join(cpufreq, node), value);
		}
	}

	async function writeThermalZone(
		name: string,
		milliDegrees: string,
	): Promise<void> {
		const zone = join(sysfsRoot, "class/thermal", name);
		await mkdir(zone, { recursive: true });
		await writeFile(join(zone, "temp"), milliDegrees);
	}

	suite("sysfsCpuFrequencyRatios", () => {
		test("reports one ratio per core exposing both nodes", async () => {
			await writeCpu("cpu0", {
				scaling_cur_freq: "1200000\n",
				cpuinfo_max_freq: "2400000\n",
			});
			await writeCpu("cpu1", {
				scaling_cur_freq: "2400000\n",
				cpuinfo_max_freq: "2400000\n",
			});

			await expect(sysfsCpuFrequencyRatios(sysfsRoot)).resolves.toEqual([
				0.5, 1,
			]);
		});

		test("skips cores with a missing, unparseable or zero node", async () => {
			await writeCpu("cpu0", { scaling_cur_freq: "1200000" });
			await writeCpu("cpu1", {
				scaling_cur_freq: "unknown",
				cpuinfo_max_freq: "2400000",
			});
			await writeCpu("cpu2", {
				scaling_cur_freq: "1200000",
				cpuinfo_max_freq: "0",
			});
			await writeCpu("cpu3", {
				scaling_cur_freq: "600000",
				cpuinfo_max_freq: "2400000",
			});

			await expect(sysfsCpuFrequencyRatios(sysfsRoot)).resolves.toEqual([0.25]);
		});

		test("ignores entries that are not numbered cores", async () => {
			await mkdir(join(sysfsRoot, "devices/system/cpu/cpufreq"), {
				recursive: true,
			});
			await mkdir(join(sysfsRoot, "devices/system/cpu/cpuidle"), {
				recursive: true,
			});

			await expect(sysfsCpuFrequencyRatios(sysfsRoot)).resolves.toEqual([]);
		});

		test("answers nothing when sysfs is not mounted", async () => {
			await expect(
				sysfsCpuFrequencyRatios(join(sysfsRoot, "absent")),
			).resolves.toEqual([]);
		});
	});

	suite("sysfsThermalZoneTemperaturesC", () => {
		test("converts millidegrees to degrees", async () => {
			await writeThermalZone("thermal_zone0", "41500\n");
			await writeThermalZone("thermal_zone1", "52000\n");

			await expect(sysfsThermalZoneTemperaturesC(sysfsRoot)).resolves.toEqual([
				41.5, 52,
			]);
		});

		test("answers nothing when no zone is exposed", async () => {
			await expect(sysfsThermalZoneTemperaturesC(sysfsRoot)).resolves.toEqual(
				[],
			);
		});
	});

	suite("readCpuFrequencyRatio", () => {
		test("averages the readable cores", async () => {
			await writeCpu("cpu0", {
				scaling_cur_freq: "1200000",
				cpuinfo_max_freq: "2400000",
			});
			await writeCpu("cpu1", {
				scaling_cur_freq: "2400000",
				cpuinfo_max_freq: "2400000",
			});

			await expect(readCpuFrequencyRatio(sysfsRoot)).resolves.toBe(0.75);
		});

		test("is null rather than 1 when nothing is readable", async () => {
			await expect(readCpuFrequencyRatio(sysfsRoot)).resolves.toBeNull();
		});
	});

	suite("readMaxTemperatureC", () => {
		test("reports the hottest zone", async () => {
			await writeThermalZone("thermal_zone0", "41500");
			await writeThermalZone("thermal_zone1", "63250");
			await writeThermalZone("thermal_zone2", "52000");

			await expect(readMaxTemperatureC(sysfsRoot)).resolves.toBe(63.25);
		});

		test("is null rather than 0 when nothing is readable", async () => {
			await expect(readMaxTemperatureC(sysfsRoot)).resolves.toBeNull();
		});
	});
});

suite("readProcessRssBytes", () => {
	let procfsRoot: string;

	beforeEach(async () => {
		procfsRoot = await createTempDir("procfs-test");
	});

	afterEach(async () => {
		await rm(procfsRoot, { recursive: true, force: true });
	});

	async function writeStatus(pid: number, status: string): Promise<void> {
		const directory = join(procfsRoot, String(pid));
		await mkdir(directory, { recursive: true });
		await writeFile(join(directory, "status"), status);
	}

	test("converts the reported kilobytes to bytes", async () => {
		await writeStatus(
			42,
			["Name:\tnode", "VmPeak:\t 1234 kB", "VmRSS:\t   2048 kB", ""].join("\n"),
		);

		await expect(readProcessRssBytes(42, procfsRoot)).resolves.toBe(
			2048 * 1024,
		);
	});

	test("is null when the process is gone", async () => {
		await expect(readProcessRssBytes(7, procfsRoot)).resolves.toBeNull();
	});

	test("is null when the status exposes no VmRSS", async () => {
		await writeStatus(42, "Name:\tkthreadd\nThreads:\t1\n");

		await expect(readProcessRssBytes(42, procfsRoot)).resolves.toBeNull();
	});
});
