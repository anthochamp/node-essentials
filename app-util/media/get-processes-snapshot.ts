import {
	type PsFilters,
	type PsResult,
	ps,
	psParseDuration,
} from "@ac-essentials/cli";
import {
	BYTES_PER_KIB,
	defaults,
	UnimplementedError,
} from "@ac-essentials/misc-util";
import type { TupleToUnion, UnknownRecord } from "type-fest";

export type ProcessInfo = {
	parentId: number;
	id: number;
	command: [string, ...string[]];
	userName: string;
	groupName: string;
	memoryUsage: number; // in bytes
	cpuUsage: number; // in percentage
	accumulatedCpuUsageMs: number; // in milliseconds
	startTime: Date;
};

export type GetProcessesSnapshotFilters = {
	parentId?: number;
	id?: number;
	command?: [string | RegExp, ...Array<string | RegExp>];
	userName?: string;
	groupName?: string;
	minMemoryUsage?: number; // in bytes
	maxMemoryUsage?: number; // in bytes
	minCpuUsage?: number; // in percentage
	maxCpuUsage?: number; // in percentage
	minAccumulatedCpuUsageMs?: number; // in milliseconds
	maxAccumulatedCpuUsageMs?: number; // in milliseconds
	minStartTime?: Date;
	maxStartTime?: Date;
};

export type GetProcessesSnapshotOptions = {
	/**
	 * Filters to apply to the process list.
	 */
	filters?: GetProcessesSnapshotFilters | null;

	/**
	 * Fields to include in the result.
	 * Defaults to `null`.
	 *
	 * If the array is empty or not provided, all available fields will be included in the result.
	 */
	fields?: (keyof ProcessInfo)[] | null;

	/**
	 * Optional signal that can be used to abort the operation.
	 */
	signal?: AbortSignal | null;
};

const GET_PROCESSES_SNAPSHOT_DEFAULT_OPTIONS: Required<GetProcessesSnapshotOptions> =
	{
		filters: null,
		fields: null,
		signal: null,
	};

const PROCESS_INFO_TO_PS_FIELD: Record<keyof ProcessInfo, keyof PsResult> = {
	parentId: "ppid",
	id: "pid",
	command: "args",
	userName: "user",
	groupName: "group",
	memoryUsage: "vsz",
	cpuUsage: "pcpu",
	accumulatedCpuUsageMs: "time",
	startTime: "etime",
} as const;

export async function getProcessesSnapshotPosix<
	O extends GetProcessesSnapshotOptions = GetProcessesSnapshotOptions,
	R = O["fields"] extends never[]
		? ProcessInfo
		: Pick<ProcessInfo, TupleToUnion<O["fields"]>>,
>(options?: O): Promise<R[]> {
	let { fields, filters, signal } = defaults(
		options,
		GET_PROCESSES_SNAPSHOT_DEFAULT_OPTIONS,
	);

	if (!fields || fields.length === 0) {
		fields = Object.keys(PROCESS_INFO_TO_PS_FIELD) as (keyof ProcessInfo)[];
	}

	const additionalFiltersFields: (keyof ProcessInfo)[] = [];

	let psFilters: PsFilters | undefined;
	if (filters) {
		psFilters = {};
		if (filters.groupName) {
			psFilters.group = [filters.groupName];
		}
		if (filters.userName) {
			psFilters.user = [filters.userName];
		}
		if (filters.id) {
			psFilters.pid = [filters.id];
		}
		if (filters.parentId && !fields.includes("parentId")) {
			additionalFiltersFields.push("parentId");
		}
		if (filters.command && !fields.includes("command")) {
			additionalFiltersFields.push("command");
		}
		if (
			(filters.minMemoryUsage || filters.maxMemoryUsage) &&
			!fields.includes("memoryUsage")
		) {
			additionalFiltersFields.push("memoryUsage");
		}
		if (
			(filters.minCpuUsage || filters.maxCpuUsage) &&
			!fields.includes("cpuUsage")
		) {
			additionalFiltersFields.push("cpuUsage");
		}
		if (
			(filters.minAccumulatedCpuUsageMs || filters.maxAccumulatedCpuUsageMs) &&
			!fields.includes("accumulatedCpuUsageMs")
		) {
			additionalFiltersFields.push("accumulatedCpuUsageMs");
		}
		if (
			(filters.minStartTime || filters.maxStartTime) &&
			!fields.includes("startTime")
		) {
			additionalFiltersFields.push("startTime");
		}
	}

	const psResult = await ps({
		selector: psFilters ?? "all",
		fields: [...fields, ...additionalFiltersFields].map(
			(f) => PROCESS_INFO_TO_PS_FIELD[f],
		),
		execOptions: {
			signal: signal ?? undefined,
		},
	});

	let result = psResult.map((psEntry) => {
		const entry = {} as Partial<ProcessInfo>;

		for (const field of fields) {
			const psField = PROCESS_INFO_TO_PS_FIELD[field];

			const psValue = psEntry[psField];

			if (psValue === undefined) {
				throw new Error(`Expected field ${psField} to be present in ps result`);
			}

			switch (psField) {
				case "vsz":
					(entry as UnknownRecord)[field] = +psValue * BYTES_PER_KIB;
					break;
				case "time":
					(entry as UnknownRecord)[field] = psParseDuration(`${psValue}`);
					break;
				case "etime":
					(entry as UnknownRecord)[field] = new Date(
						Date.now() - psParseDuration(`${psValue}`),
					);
					break;
				default:
					(entry as UnknownRecord)[field] = psEntry[psField];
					break;
			}
		}

		return entry;
	});

	if (additionalFiltersFields.length > 0) {
		result = result.filter((entry) => {
			if (
				filters?.parentId !== undefined &&
				entry.parentId !== filters.parentId
			) {
				return false;
			}
			if (filters?.command !== undefined && entry.command !== undefined) {
				const [cmd, ...args] = filters.command;
				if (typeof cmd === "string") {
					if (entry.command[0] !== cmd) {
						return false;
					}
				} else {
					if (!cmd.test(entry.command[0])) {
						return false;
					}
				}

				for (let i = 0; i < args.length; i++) {
					// biome-ignore lint/style/noNonNullAssertion: for loop
					const arg = args[i]!;

					const entryArg = entry.command[i + 1];
					if (entryArg === undefined) {
						return false;
					}

					if (typeof arg === "string") {
						if (entryArg !== arg) {
							return false;
						}
					} else {
						if (!arg.test(entryArg)) {
							return false;
						}
					}
				}
			}
			if (
				filters?.minMemoryUsage !== undefined &&
				entry.memoryUsage !== undefined &&
				entry.memoryUsage < filters.minMemoryUsage
			) {
				return false;
			}
			if (
				filters?.maxMemoryUsage !== undefined &&
				entry.memoryUsage !== undefined &&
				entry.memoryUsage > filters.maxMemoryUsage
			) {
				return false;
			}
			if (entry.cpuUsage !== undefined) {
				if (
					filters?.minCpuUsage !== undefined &&
					entry.cpuUsage < filters.minCpuUsage
				) {
					return false;
				}

				if (
					filters?.maxCpuUsage !== undefined &&
					entry.cpuUsage > filters.maxCpuUsage
				) {
					return false;
				}
			}

			if (entry.accumulatedCpuUsageMs !== undefined) {
				if (
					filters?.minAccumulatedCpuUsageMs !== undefined &&
					entry.accumulatedCpuUsageMs < filters.minAccumulatedCpuUsageMs
				) {
					return false;
				}
				if (
					filters?.maxAccumulatedCpuUsageMs !== undefined &&
					entry.accumulatedCpuUsageMs > filters.maxAccumulatedCpuUsageMs
				) {
					return false;
				}
			}

			if (entry.startTime !== undefined) {
				if (
					filters?.minStartTime !== undefined &&
					entry.startTime < filters.minStartTime
				) {
					return false;
				}
				if (
					filters?.maxStartTime !== undefined &&
					entry.startTime > filters.maxStartTime
				) {
					return false;
				}
			}

			return true;
		});

		// Remove any additional fields used for filtering
		result = result.map((entry) => {
			for (const field of additionalFiltersFields) {
				delete (entry as UnknownRecord)[field];
			}
			return entry;
		});
	}

	return result as R[];
}

export async function getProcessesSnapshotWin32<
	O extends GetProcessesSnapshotOptions = GetProcessesSnapshotOptions,
	R = O["fields"] extends never[]
		? ProcessInfo
		: Pick<ProcessInfo, TupleToUnion<O["fields"]>>,
>(_options?: O): Promise<R[]> {
	// TODO: either with tasklist or wmi
	throw new UnimplementedError();
}

type GetProcessesSnapshot = <
	O extends GetProcessesSnapshotOptions = GetProcessesSnapshotOptions,
	R = O["fields"] extends never[]
		? ProcessInfo
		: Pick<ProcessInfo, TupleToUnion<O["fields"]>>,
>(
	options?: O,
) => Promise<R[]>;

export const getProcessesSnapshot: GetProcessesSnapshot =
	process.platform === "win32"
		? getProcessesSnapshotWin32
		: getProcessesSnapshotPosix;
