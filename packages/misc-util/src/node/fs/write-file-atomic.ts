import * as constants from "node:constants";
import type { PathLike, Stats } from "node:fs";
import {
	chmod,
	copyFile,
	rename,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { defaults } from "../../ecma/object/defaults.js";
import { isNodeErrorWithCode } from "../error/node-error.js";
import {
	NODE_WRITE_FILE_DEFAULT_OPTIONS,
	type NodeWriteFileOptions,
} from "./types.js";

/**
 * Writes data to a file atomically, ensuring that the file is either fully written or not modified at all.
 *
 * This function first writes the data to a temporary file and then renames it to the target file path.
 * This approach minimizes the risk of data corruption in case of interruptions during the write process.
 *
 * @param filePath The path to the file where data should be written.
 * @param data The data to write to the file. Can be a string or a Buffer.
 * @param options Optional settings for writing the file, including encoding, mode, and flags.
 *                If `options.signal` is provided, it can be used to abort the operation.
 * @returns A promise that resolves when the write operation is complete.
 * @throws Will throw an error if the write operation fails.
 */
export async function writeFileAtomic(
	filePath: PathLike,
	data: Parameters<typeof writeFile>[1],
	options?: NodeWriteFileOptions,
): ReturnType<typeof writeFile> {
	const tmpFilePathSuffix =
		"." +
		["tmp", process.pid, Date.now(), Math.random().toString(16).slice(2)].join(
			"-",
		);

	let tmpFilePath: string | Buffer;
	if (filePath instanceof URL) {
		if (filePath.protocol !== "file:") {
			throw new TypeError(
				`The URL must be of scheme file: ${filePath.toString()}`,
			);
		}
		tmpFilePath = filePath.pathname + tmpFilePathSuffix;
	} else if (Buffer.isBuffer(filePath)) {
		tmpFilePath = Buffer.concat([filePath, Buffer.from(tmpFilePathSuffix)]);
	} else {
		tmpFilePath = filePath + tmpFilePathSuffix;
	}

	let stats: Stats | undefined;
	try {
		stats = await stat(filePath);
	} catch {}

	const effectiveOptions = defaults(
		options,
		{
			mode: stats?.mode,
		},
		NODE_WRITE_FILE_DEFAULT_OPTIONS,
	);

	if (
		(typeof effectiveOptions.flag === "string" &&
			effectiveOptions.flag.includes("x")) ||
		(typeof effectiveOptions.flag === "number" &&
			(effectiveOptions.flag & constants.O_EXCL) === constants.O_EXCL)
	) {
		if (stats) {
			throw Object.assign(new Error("File already exists"), {
				code: "EEXIST",
				errno: -17,
			});
		}
	}

	if (
		(typeof effectiveOptions.flag === "string" &&
			effectiveOptions.flag.includes("a")) ||
		(typeof effectiveOptions.flag === "number" &&
			(effectiveOptions.flag & constants.O_TRUNC) !== constants.O_TRUNC)
	) {
		try {
			await copyFile(filePath, tmpFilePath, constants.COPYFILE_EXCL);

			try {
				await chmod(tmpFilePath, effectiveOptions.mode);
			} catch (error) {
				try {
					await unlink(tmpFilePath);
				} catch {}

				throw error;
			}
		} catch {}
	}

	await writeFile(tmpFilePath, data, {
		...effectiveOptions,
		signal: effectiveOptions.signal ?? undefined,
	});

	try {
		try {
			await unlink(filePath);
		} catch (error) {
			if (!isNodeErrorWithCode(error, "ENOENT")) {
				throw error;
			}
		}

		await rename(tmpFilePath, filePath);
	} finally {
		try {
			await unlink(tmpFilePath);
		} catch {}
	}
}
