import type { ExecOptions } from "node:child_process";
import { EOL } from "node:os";
import {
	defaults,
	escapePosixShCommand,
	escapePosixShCommandArg,
	execAsync,
	MS_PER_DAY,
	MS_PER_HOUR,
	MS_PER_MINUTE,
	MS_PER_SECOND,
	ProcessExitWithOutputError,
} from "@ac-essentials/misc-util";
import type { TupleToUnion, UnknownRecord } from "type-fest";

export type PsFilters = {
	// Group ID (argument: -G)
	// Unsupported in OpenBSD
	group?: (number | string)[];

	// Process ID (argument: -p)
	pid?: number[];

	// Terminal (argument: -t)
	tty?: string[];

	// User ID (argument: -U)
	user?: (number | string)[];
};

export type PsSelector = "all" | "tty" | PsFilters;

export type PsOptions = {
	/**
	 * Selector to filter processes.
	 * Defaults to `"all"`.
	 *
	 * If a string is provided, it can be:
	 * - "all": Select all processes (equivalent to `-A` argument).
	 * - "tty": Select processes associated with a terminal (equivalent to `-a` argument).
	 *
	 * If an object is provided, it can contain any of the following optional properties to filter processes:
	 * - `group`: An array of group IDs (numbers or strings) to filter by group ID (argument: `-G`).
	 * - `pid`: An array of process IDs (numbers) to filter by process ID (argument: `-p`).
	 * - `tty`: An array of terminal names (strings) to filter by terminal (argument: `-t`).
	 * - `user`: An array of user IDs (numbers or strings) to filter by user ID (argument: `-U`).
	 */
	selector?: PsSelector;

	/**
	 * Fields to include in the result.
	 * Defaults to `null`.
	 *
	 * If the array is empty or not provided, all available fields will be included in the result.
	 *
	 * Available fields are:
	 * - `args`: Command and arguments.
	 * - `comm`: Name to be used for accounting.
	 * - `etime`: Elapsed time since the process was started.
	 * - `group`: Text name of effective group ID.
	 * - `nice`: The process scheduling increment (see setpriority(2)).
	 * - `pcpu`: The CPU utilization of the process; this is a decaying average over up to a minute of previous (real) time. Since the time base over which this is computed varies (since processes may be very young), it is possible for the sum of all %cpu fields to exceed 100%.
	 * - `pgid`: Process group number.
	 * - `pid`: Process ID.
	 * - `ppid`: Parent process ID.
	 * - `rgroup`: Text name of real group ID.
	 * - `ruser`: User name (from ruid).
	 * - `time`: Accumulated CPU time, user + system.
	 * - `tty`: Full name of controlling terminal.
	 * - `user`: User name (from uid).
	 * - `vsz`: Virtual size, in Kilobytes.
	 */
	fields?: (keyof PsResult)[] | null;

	/**
	 * Additional command arguments to pass to `ps`.
	 * Defaults to `null`.
	 *
	 * These will be appended to the command after the selector and output format arguments.
	 * Use with caution, as they may conflict with other arguments.
	 *
	 * Also, be careful to escape any argument if necessary to avoid shell injection vulnerabilities.
	 */
	extraArgs?: string[] | null;

	/**
	 * Additional execution options.
	 * Defaults to `null`.
	 *
	 * These options are passed to the underlying `exec` function.
	 */
	execOptions?: Omit<ExecOptions, "encoding"> | null;
};

export const PS_DEFAULT_OPTIONS: Required<PsOptions> = {
	selector: "all",
	fields: null,
	extraArgs: null,
	execOptions: null,
};

export type PsResult = Record<string, string | number> & {
	// Command and arguments.
	args: [string, ...string[]];
	// Name to be used for accounting.
	comm: string;
	// Elapsed time since the process was started.
	etime: string;
	// Text name of effective group ID.
	group: string;
	// The process scheduling increment (see setpriority(2)).
	nice: number;
	// The CPU utilization of the process; this is a decaying average over up to a minute of previous (real) time. Since the time base over which this is computed varies (since processes may be very young), it is possible for the sum of all %cpu fields to exceed 100%.
	pcpu: number;
	// Process group number.
	pgid: number;
	// Process ID.
	pid: number;
	// Parent process ID.
	ppid: number;
	// Text name of real group ID.
	rgroup: number;
	// User name (from ruid).
	ruser: string;
	// Accumulated CPU time, user + system.
	time: string;
	// Full name of controlling terminal.
	tty: string;
	// User name (from uid).
	user: string;
	// Virtual size, in Kilobytes.
	vsz: number;
};

const PS_RESULT_FIELDS: (keyof PsResult)[] = [
	"args",
	"comm",
	"etime",
	"group",
	"nice",
	"pcpu",
	"pgid",
	"pid",
	"ppid",
	"rgroup",
	"ruser",
	"time",
	"tty",
	"user",
	"vsz",
] as const;

/**
 * Get the list of running processes using the `ps` command.
 *
 * @param options Options for filtering and selecting fields.
 * @returns A promise that resolves to an array of process information objects.
 */
export async function ps<
	O extends PsOptions = PsOptions,
	R = O["fields"] extends never[]
		? Partial<PsResult>
		: Pick<PsResult, TupleToUnion<O["fields"]>>,
>(options?: O): Promise<R[]> {
	const effectiveOptions = defaults(options, PS_DEFAULT_OPTIONS);

	const columns =
		!effectiveOptions.fields || effectiveOptions.fields.length === 0
			? PS_RESULT_FIELDS
			: effectiveOptions.fields;

	// Ensure args is the last column, so that splitting by whitespace works correctly
	if (columns.includes("args")) {
		columns.splice(columns.indexOf("args"), 1);
		columns.push("args");
	}

	const commandArgs = [
		"-ww",
		...buildPsSelectorArgs(effectiveOptions.selector ?? "all"),
		"-o",
		escapePosixShCommandArg(columns.join(",")),
	];

	const command = escapePosixShCommand(`ps ${commandArgs.join(" ")}`);

	let output: string;
	try {
		const result = await execAsync(command, {
			...effectiveOptions.execOptions,
			encoding: "utf-8",
			env: {
				...effectiveOptions.execOptions?.env,
				PS_PERSONALITY: "posix",
				LANG: "C",
				LC_ALL: "C",
			},
		});
		output = result.stdout;
	} catch (error) {
		// If `ps` fails with exit code 1 but produces output (header), return an empty list
		if (
			error instanceof ProcessExitWithOutputError &&
			error.code === 1 &&
			error.stdout.length > 0
		) {
			return [];
		}

		throw error;
	}

	const [_, ...rows] = output.trim().split(EOL);

	return rows.map((row) => {
		const rowColumns = row.trim().split(/\s+/);
		if (rowColumns.length > columns.length) {
			// The args column may contain spaces, so merge any extra cells into the last column
			const args = rowColumns.slice(columns.length - 1).join(" ");
			rowColumns.splice(
				columns.length - 1,
				rowColumns.length - columns.length + 1,
				args,
			);
		}

		const entry: R = {} as R;

		for (let c = 0; c < rowColumns.length; c++) {
			const field = columns[c];

			let value: string | number = rowColumns[c];

			const intValue = parseInt(value, 10);
			if (!Number.isNaN(intValue) && `${intValue}` === value) {
				// Exact match, use integer value
				value = intValue;
			}

			(entry as UnknownRecord)[field] = value;
		}

		return entry;
	});
}

function buildPsFiltersArgs(filters: PsFilters): string[] {
	const args: string[] = [];

	if (filters.group?.length) {
		args.push(
			"-G",
			...filters.group.map((n) => escapePosixShCommandArg(`${n}`)),
		);
	}

	if (filters.pid?.length) {
		args.push("-p", ...filters.pid.map((n) => escapePosixShCommandArg(`${n}`)));
	}

	if (filters.tty?.length) {
		args.push("-t", ...filters.tty.map(escapePosixShCommandArg));
	}

	if (filters.user?.length) {
		args.push(
			"-U",
			...filters.user.map((n) => escapePosixShCommandArg(`${n}`)),
		);
	}

	return args;
}

function buildPsSelectorArgs(selector: PsSelector): string[] {
	if (typeof selector === "string") {
		if (selector === "all") {
			// Select all processes (argument: -A)
			return ["-A"];
		}

		// Select processes associated with a terminal (argument: -a)
		return ["-a"];
	}

	const args = buildPsFiltersArgs(selector);
	if (args.length === 0) {
		// If no filters are specified, select all processes
		return ["-A"];
	}

	return args;
}

/**
 * Parse a duration string in the format [[[dd-]hh:]mm:]ss to milliseconds.
 *
 * @param duration Duration string in the format [[[dd-]hh:]mm:]ss
 * @returns The duration in milliseconds.
 */
export function psParseDuration(duration: string): number {
	const parts = duration.split("-");

	let days = 0;
	let timePart = duration;
	if (parts.length === 2) {
		days = +parts[0];
		timePart = parts[1];
	}

	const timeParts = timePart.split(":").reverse();

	if ((parts.length === 2 && timeParts.length !== 3) || timeParts.length > 3) {
		throw new Error(`Invalid duration format: ${duration}`);
	}

	const seconds = timeParts[0].length === 2 ? +timeParts[0] : NaN;

	let minutes = 0;
	if (timeParts.length > 1) {
		minutes = timeParts[1].length === 2 ? +timeParts[1] : NaN;
	}

	let hours = 0;
	if (timeParts.length > 2) {
		hours = timeParts[2].length === 2 ? +timeParts[2] : NaN;
	}

	const result =
		days * MS_PER_DAY +
		hours * MS_PER_HOUR +
		minutes * MS_PER_MINUTE +
		seconds * MS_PER_SECOND;

	if (Number.isNaN(result)) {
		throw new Error(`Invalid duration format: ${duration}`);
	}

	return result;
}
