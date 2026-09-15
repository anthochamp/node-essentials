import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { walkPaths } from "@ac-kit/node";

/**
 * Raw readers over Linux's sysfs pseudo-filesystem. Every reader answers `null`
 * rather than throwing when the node is absent or unreadable: sysfs layout
 * varies with the kernel configuration, and an absent node is a normal outcome,
 * not a failure. Nothing read here is privileged.
 */

export const SYSFS_DEFAULT_ROOT = "/sys";

const CPU_DIRECTORY = /^cpu\d+$/;
const THERMAL_ZONE_DIRECTORY = /^thermal_zone\d+$/;

async function readNumberNode(path: string): Promise<number | null> {
	try {
		const value = Number.parseFloat(await readFile(path, "utf8"));
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * `scaling_cur_freq / cpuinfo_max_freq` for every core exposing both, in
 * `/sys/devices/system/cpu/cpu*\/cpufreq`. Empty when `cpufreq` is not
 * configured.
 */
export async function sysfsCpuFrequencyRatios(
	sysfsRoot = SYSFS_DEFAULT_ROOT,
): Promise<number[]> {
	const cpuRoot = join(sysfsRoot, "devices", "system", "cpu");
	const ratios: number[] = [];

	for await (const { path } of walkPaths({
		root: cpuRoot,
		include: CPU_DIRECTORY,
		unreadable: "skip",
	})) {
		const cpufreq = join(cpuRoot, path, "cpufreq");
		const [current, max] = await Promise.all([
			readNumberNode(join(cpufreq, "scaling_cur_freq")),
			readNumberNode(join(cpufreq, "cpuinfo_max_freq")),
		]);

		if (current === null || max === null || max <= 0) {
			continue;
		}
		ratios.push(current / max);
	}

	return ratios;
}

/**
 * Temperature of every readable zone in `/sys/class/thermal`, converted from
 * the millidegrees Celsius the nodes report. Empty when no zone is exposed.
 */
export async function sysfsThermalZoneTemperaturesC(
	sysfsRoot = SYSFS_DEFAULT_ROOT,
): Promise<number[]> {
	const thermalRoot = join(sysfsRoot, "class", "thermal");
	const temperatures: number[] = [];

	for await (const { path } of walkPaths({
		root: thermalRoot,
		include: THERMAL_ZONE_DIRECTORY,
		unreadable: "skip",
	})) {
		const milliDegrees = await readNumberNode(join(thermalRoot, path, "temp"));
		if (milliDegrees !== null) {
			temperatures.push(milliDegrees / 1000);
		}
	}

	return temperatures;
}
