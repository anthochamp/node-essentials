import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
	sysfsCpuFrequencyRatios,
	sysfsThermalZoneTemperaturesC,
} from "./sysfs.js";

/**
 * Mean of `scaling_cur_freq / cpuinfo_max_freq` across the cores exposing both,
 * or `null` where the platform exposes neither — which a caller must read as
 * "unknown", never as "nominal".
 *
 * A ratio well below 1 during a measurement means the CPU is being clocked
 * down, which invalidates a comparison against samples taken at full speed.
 *
 * Only Linux publishes these nodes, so every other platform answers `null` by
 * simply finding nothing to read.
 *
 * @param sysfsRoot Root of the sysfs mount. Defaults to `/sys`.
 */
export async function readCpuFrequencyRatio(
	sysfsRoot?: string,
): Promise<number | null> {
	const ratios = await sysfsCpuFrequencyRatios(sysfsRoot);
	if (ratios.length === 0) {
		return null;
	}

	let total = 0;
	for (const ratio of ratios) {
		total += ratio;
	}
	return total / ratios.length;
}

/**
 * Temperature of the hottest readable thermal zone in °C, or `null` where the
 * platform exposes none.
 *
 * Only Linux publishes these nodes, so every other platform answers `null` by
 * simply finding nothing to read.
 *
 * @param sysfsRoot Root of the sysfs mount. Defaults to `/sys`.
 */
export async function readMaxTemperatureC(
	sysfsRoot?: string,
): Promise<number | null> {
	let hottest: number | null = null;
	for (const temperature of await sysfsThermalZoneTemperaturesC(sysfsRoot)) {
		if (hottest === null || temperature > hottest) {
			hottest = temperature;
		}
	}
	return hottest;
}

export const PROCFS_DEFAULT_ROOT = "/proc";

const VM_RSS_LINE = /^VmRSS:\s+(\d+)\s+kB$/m;

/**
 * Resident set size of another process in bytes, or `null` when the process is
 * gone, the platform exposes no procfs, or the caller may not read it.
 *
 * Reads `VmRSS` from `/proc/<pid>/status` rather than the resident-pages field
 * of `statm`, because that one is a page count and the page size is not
 * knowable from Node — 4 KiB is only the common case, and an arm64 kernel
 * configured for 16 KiB pages would make every reading wrong by a factor of
 * four.
 *
 * Cheap enough to poll at second granularity, unlike
 * {@link getProcessesSnapshot}, which spawns `ps`.
 *
 * @param pid The process to inspect.
 * @param procfsRoot Root of the procfs mount. Defaults to `/proc`.
 */
export async function readProcessRssBytes(
	pid: number,
	procfsRoot: string = PROCFS_DEFAULT_ROOT,
): Promise<number | null> {
	try {
		const status = await readFile(join(procfsRoot, String(pid), "status"), {
			encoding: "utf8",
		});
		const kilobytes = VM_RSS_LINE.exec(status)?.[1];

		return kilobytes === undefined
			? null
			: Number.parseInt(kilobytes, 10) * 1024;
	} catch {
		return null;
	}
}
