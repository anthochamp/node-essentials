import { randomUUID } from "node:crypto";
import { constants, type Mode, type PathLike, type Stats } from "node:fs";
import { chmod, rename, stat, unlink, writeFile } from "node:fs/promises";
import { constants as osConstants } from "node:os";
import { fileURLToPath } from "node:url";

import { defaults } from "@ac-kit/core";

import {
	NODE_WRITE_FILE_DEFAULT_OPTIONS,
	type NodeWriteFileOptions,
} from "./types.js";

const PERMISSION_BITS = 0o7777;

function isAppendFlag(flag: string | number): boolean {
	return typeof flag === "string"
		? flag.includes("a")
		: (flag & constants.O_APPEND) === constants.O_APPEND;
}

function isExclusiveFlag(flag: string | number): boolean {
	return typeof flag === "string"
		? flag.includes("x")
		: (flag & constants.O_EXCL) === constants.O_EXCL;
}

function toPermissionBits(mode: Mode): number {
	return (
		(typeof mode === "string" ? Number.parseInt(mode, 8) : mode) &
		PERMISSION_BITS
	);
}

/**
 * The temporary file sits beside the destination: `rename` is only atomic
 * within one filesystem, so a system temporary directory would break it.
 */
function temporaryPathFor(filePath: PathLike): string | Buffer {
	const suffix = `.tmp-${randomUUID()}`;

	if (filePath instanceof URL) {
		// `pathname` is percent-encoded; `fileURLToPath` also rejects non-`file:`.
		return fileURLToPath(filePath) + suffix;
	}
	if (Buffer.isBuffer(filePath)) {
		return Buffer.concat([filePath, Buffer.from(suffix)]);
	}
	return filePath + suffix;
}

function fileAlreadyExistsError(filePath: PathLike): Error {
	const path = filePath instanceof URL ? fileURLToPath(filePath) : filePath;
	const errno = -osConstants.errno.EEXIST;

	return Object.assign(
		new Error(`EEXIST: file already exists, open '${String(path)}'`),
		{
			code: "EEXIST",
			errno,
			syscall: "open",
			path,
			info: { errno, syscall: "open", path },
		},
	);
}

/**
 * Replaces a file's contents in one step: a reader sees either the previous
 * contents or the new ones, never a partial write.
 *
 * The data goes to a uniquely named temporary file beside the destination,
 * which is then `rename`d over it. `rename` replaces the destination
 * atomically, so no window exists in which the path is missing.
 *
 * Appending is rejected — `flag: "a"` and `O_APPEND` throw. Staging an append
 * means copying the destination into the temporary file and appending there,
 * which silently discards whatever another process wrote in between: the
 * opposite of what an appender expects. Read, concatenate and replace instead,
 * serialising the writers yourself when there is more than one:
 *
 * ```ts
 * const current = await readFile(path, "utf8").catch(() => "");
 * await writeFileAtomic(path, `${current}${line}\n`);
 * ```
 *
 * When the destination already exists its permission bits carry over, unless
 * `options.mode` says otherwise. Ownership does not: the replacement belongs to
 * the calling user.
 *
 * Durability is a separate concern from atomicity — pass `flush: true` to fsync
 * the data before the rename. The parent directory is never fsynced, so the
 * rename itself may still be lost to a power failure.
 *
 * @param filePath The path to replace.
 * @param data The contents to write.
 * @param options Encoding, mode, flag, flush and abort signal, as for
 *   `fs.writeFile`. `flag` may only select exclusive creation (`"wx"`,
 *   `O_EXCL`); appending throws.
 * @returns A promise that resolves once the destination holds the new contents.
 * @throws {TypeError} When `options.flag` requests an append.
 * @throws When the destination exists and `options.flag` is exclusive (`code:
 *   "EEXIST"`), or when any underlying syscall fails.
 */
export async function writeFileAtomic(
	filePath: PathLike,
	data: Parameters<typeof writeFile>[1],
	options?: NodeWriteFileOptions,
): ReturnType<typeof writeFile> {
	const flag = options?.flag ?? NODE_WRITE_FILE_DEFAULT_OPTIONS.flag;
	if (isAppendFlag(flag)) {
		throw new TypeError(
			"writeFileAtomic cannot append: staging an append drops concurrent writes. Read the file and write the concatenation instead.",
		);
	}

	let stats: Stats | undefined;
	try {
		stats = await stat(filePath);
	} catch {}

	if (stats && isExclusiveFlag(flag)) {
		throw fileAlreadyExistsError(filePath);
	}

	const effectiveOptions = defaults(options, NODE_WRITE_FILE_DEFAULT_OPTIONS);
	// Left unset, the mode is the caller's umask business, exactly as for a
	// plain `writeFile`; set, it has to survive the umask, hence the `chmod`.
	const requestedMode = options?.mode ?? stats?.mode;
	const mode = toPermissionBits(
		requestedMode ?? NODE_WRITE_FILE_DEFAULT_OPTIONS.mode,
	);

	const tmpFilePath = temporaryPathFor(filePath);

	try {
		await writeFile(tmpFilePath, data, {
			...effectiveOptions,
			mode,
			// The temporary file is always a fresh create under a name of our own.
			flag: "wx",
			signal: effectiveOptions.signal ?? undefined,
		});

		if (requestedMode !== undefined) {
			await chmod(tmpFilePath, mode);
		}

		await rename(tmpFilePath, filePath);
	} catch (error) {
		try {
			await unlink(tmpFilePath);
		} catch {}

		throw error;
	}
}
