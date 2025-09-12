import { readdir, rename, stat, unlink } from "node:fs/promises";
import * as path from "node:path";
import {
	defaults,
	existsAsync,
	MS_PER_MINUTE,
	regexpEscape,
} from "@ac-essentials/misc-util";

export type RotateLogFilesOptions = {
	/**
	 * The maximum number of rotated log files to retain.
	 *
	 * Default is 5.
	 */
	maxRetainedFiles?: number;

	/**
	 * The minimum duration (in milliseconds) to retain a log file before it can
	 * be deleted.
	 *
	 * Note: This setting takes precedence over `maxRetainedFiles`.
	 *
	 * Default is 5 minutes.
	 */
	minFileHistoryDurationMs?: number;
};

export const ROTATE_LOG_FILES_DEFAULT_OPTIONS: Required<RotateLogFilesOptions> =
	{
		maxRetainedFiles: 5,
		minFileHistoryDurationMs: 5 * MS_PER_MINUTE,
	};

export async function rotateLogFiles(
	filePath: string,
	options?: RotateLogFilesOptions,
): Promise<void> {
	const effectiveOptions = defaults(options, ROTATE_LOG_FILES_DEFAULT_OPTIONS);

	if (!(await existsAsync(filePath))) {
		return;
	}

	const dirName = path.dirname(filePath);
	const fileName = path.basename(filePath);

	// that will help find the log-num index (in the split '.' array)
	const prefixDotsCnt = fileName.split(".").length - 1;

	// get all files list (as filename split '.' array), from oldest to newest
	const oldFilesNames = (await readdir(dirName))
		.map((v) =>
			v.match(`${regexpEscape(fileName)}\\.\\d+\\.?`) ? v.split(".") : null,
		)
		.filter((v) => v !== null)
		.sort((a, b) => +a[prefixDotsCnt + 1] - +b[prefixDotsCnt + 1])
		.reverse();

	// rename or delete files based on options
	for (const oldFileName of oldFilesNames) {
		const oldFilePath = path.join(dirName, oldFileName.join("."));
		const fileNum = +oldFileName[prefixDotsCnt + 1];

		if (
			fileNum + 1 > effectiveOptions.maxRetainedFiles &&
			(await stat(oldFilePath)).mtime.getTime() <
				Date.now() - effectiveOptions.minFileHistoryDurationMs
		) {
			await unlink(oldFilePath);
		} else {
			await rename(
				oldFilePath,
				path.join(
					dirName,
					[
						...oldFileName.slice(0, prefixDotsCnt + 1),
						fileNum + 1,
						...oldFileName.slice(prefixDotsCnt + 2),
					].join("."),
				),
			);
		}
	}

	await rename(filePath, `${filePath}.0`);
}
