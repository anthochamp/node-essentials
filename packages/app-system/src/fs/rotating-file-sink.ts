import { once } from "node:events";
import { createWriteStream, type WriteStream } from "node:fs";
import { stat } from "node:fs/promises";

import type { Formatter, ISink, ReportEvent } from "@ac-kit/app-report";
import { ScopeTracker } from "@ac-kit/app-report";
import { LockHold, Mutex } from "@ac-kit/async";
import { BYTES_PER_MIB, defaults, serializeQueueNext } from "@ac-kit/core";
import { compressFile, existsAsync, nodeWriteAsync } from "@ac-kit/node";

import {
	ROTATE_LOG_FILES_DEFAULT_OPTIONS,
	rotateLogFiles,
	type RotateLogFilesOptions,
} from "./rotate-log-files.js";

export type RotatingFileSinkOptions<TData> = RotateLogFilesOptions & {
	formatter: Formatter<TData>;

	/**
	 * The maximum size (in bytes) the file can reach before being rotated.
	 * Default is 10 MiB. Set to `null` to disable size-based rotation.
	 */
	cutOffFileSize?: number | null;

	/**
	 * The maximum age (in milliseconds) the file can reach before being rotated.
	 * Default is `null` (disabled).
	 */
	maxFileAgeMs?: number | null;

	/** Whether to compress rotated files using gzip. Default `false`. */
	useCompression?: boolean;

	/** Appended after every non-`null` formatted line. Default `"\n"`. */
	eol?: string;
};

type ResolvedOptions = Required<
	Omit<RotatingFileSinkOptions<never>, "formatter">
>;

const ROTATING_FILE_SINK_DEFAULT_OPTIONS: ResolvedOptions = {
	...ROTATE_LOG_FILES_DEFAULT_OPTIONS,
	cutOffFileSize: 10 * BYTES_PER_MIB,
	maxFileAgeMs: null,
	useCompression: false,
	eol: "\n",
};

/**
 * Renders through a {@link Formatter} into a file, with rotation by size and/or
 * age. Extracted from `@ac-kit/app-logger`'s `FilePrinter`, generic over
 * `TData` so measure/process output gains rotation for free.
 */
export class RotatingFileSink<TData> implements ISink<TData> {
	private readonly scopeTracker = new ScopeTracker();
	private readonly formatter: Formatter<TData>;
	private readonly options: ResolvedOptions;
	private fileStream: WriteStream | null = null;
	private readonly streamLock = new Mutex();
	private readonly rotationLock = new Mutex();
	private readonly rotationSqn = serializeQueueNext(() =>
		this.handleRotation(),
	);

	constructor(
		private readonly filePath: string,
		options: RotatingFileSinkOptions<TData>,
	) {
		const { formatter, ...rest } = options;
		this.formatter = formatter;
		this.options = defaults(rest, ROTATING_FILE_SINK_DEFAULT_OPTIONS);
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		this.scopeTracker.observe(event);

		const line = this.formatter(event, { scopes: this.scopeTracker });
		if (line === null) {
			return;
		}

		{
			await using _streamLock = await LockHold.from([this.streamLock]);
			const stream = await this.openStream();
			signal?.throwIfAborted();
			await nodeWriteAsync(stream, line + this.options.eol);
		}

		await this.rotationSqn();
	}

	async flush(): Promise<void> {
		await this.rotationSqn();
	}

	async close(): Promise<void> {
		{
			await using _streamLock = await LockHold.from([this.streamLock]);
			await this.closeStream();
		}

		await this.rotationSqn();
	}

	private async openStream(): Promise<WriteStream> {
		if (!this.fileStream) {
			const stream = createWriteStream(this.filePath, { flags: "a" });
			// `once()` rejects on an "error" emitted before the awaited event.
			await once(stream, "open");

			this.fileStream = stream;
			this.fileStream.on("close", () => {
				this.fileStream = null;
			});
		}

		return this.fileStream;
	}

	private async closeStream(): Promise<void> {
		const stream = this.fileStream;
		this.fileStream = null;

		if (!stream) {
			return;
		}

		stream.end();
		await once(stream, "finish");
	}

	private async handleRotation(): Promise<void> {
		await using _rotationLock = await LockHold.from([this.rotationLock]);

		const { cutOffFileSize, maxFileAgeMs, useCompression } = this.options;
		if (cutOffFileSize === null && maxFileAgeMs === null) {
			return;
		}

		let stats: Awaited<ReturnType<typeof stat>> | undefined;
		try {
			stats = await stat(this.filePath);
		} catch {
			return;
		}

		const exceedsSize = cutOffFileSize !== null && stats.size >= cutOffFileSize;
		const exceedsAge =
			maxFileAgeMs !== null &&
			Date.now() - stats.mtime.getTime() >= maxFileAgeMs;

		if (!exceedsSize && !exceedsAge) {
			return;
		}

		{
			await using _streamLock = await LockHold.from([this.streamLock]);
			await this.closeStream();
			await rotateLogFiles(this.filePath, this.options);
		}

		// `rotateLogFiles` always renames the just-rotated file to `.0` — every
		// older generation shifts up (`.0`→`.1`, …) in the same call, so `.0` is
		// unambiguously *this* rotation's file, unlike a fixed-generation number.
		if (useCompression && (await existsAsync(`${this.filePath}.0`))) {
			await compressFile(`${this.filePath}.0`);
		}
	}
}
