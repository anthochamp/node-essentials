import { createWriteStream, type Stats, type WriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
	BYTES_PER_MIB,
	compressFile,
	debounceQueue,
	defaults,
	Mutex,
} from "@ac-essentials/misc-util";
import { pathExists } from "find-up";
import {
	ROTATE_LOG_FILES_DEFAULT_OPTIONS,
	type RotateLogFilesOptions,
	rotateLogFiles,
} from "../../system/fs/rotate-log-files.js";
import type { ILoggerPrinter } from "../logger-printer.js";
import type { LoggerRecord } from "../logger-record.js";
import {
	TEXT_STREAM_PRINTER_DEFAULT_OPTIONS,
	TextStreamPrinter,
	type TextStreamPrinterOptions,
} from "./text-stream-printer.js";

export type FilePrinterOptions = TextStreamPrinterOptions &
	RotateLogFilesOptions & {
		/**
		 * The maximum size (in bytes) a log file can reach before being rotated.
		 * Default is 10 MiB.
		 *
		 * Set to `null` or `0` to disable size-based rotation.
		 */
		cutOffFileSize?: number | null;

		/**
		 * The maximum age (in milliseconds) a log file can reach before being
		 * rotated.
		 *
		 * Default is `null` (disabled).
		 */
		maxFileAgeMs?: number | null;

		/**
		 * Whether to compress rotated log files using gzip.
		 */
		useCompression?: boolean;
	};

const FILE_PRINTER_DEFAULT_OPTIONS: Required<FilePrinterOptions> = {
	...TEXT_STREAM_PRINTER_DEFAULT_OPTIONS,
	...ROTATE_LOG_FILES_DEFAULT_OPTIONS,
	cutOffFileSize: 10 * BYTES_PER_MIB,
	maxFileAgeMs: null,
	useCompression: false,
};

/**
 * A logger printer that writes log records to a file, with support for log
 * rotation based on file size or age.
 */
export class FilePrinter implements ILoggerPrinter {
	private readonly options: Required<FilePrinterOptions>;
	private fileStream: WriteStream | null = null;
	private textStreamPrinter: TextStreamPrinter | null = null;
	private readonly streamPrinterLock = new Mutex();
	private readonly handleRotationLock = new Mutex();
	private readonly handleRotationDebounced = debounceQueue(() =>
		this.handleRotation(),
	);

	/**
	 * Creates a new FilePrinter instance.
	 *
	 * @param filePath The path to the log file.
	 * @param options Optional settings for the file printer.
	 */
	constructor(
		private readonly filePath: string,
		options?: FilePrinterOptions,
	) {
		this.options = defaults(options, FILE_PRINTER_DEFAULT_OPTIONS);
	}

	/**
	 * Closes the file printer, ensuring all pending log records are flushed
	 * and the file stream is properly closed.
	 */
	async close(): Promise<void> {
		await this.streamPrinterLock.withLock(async () => {
			await this._unprotected_close();
		});

		await this.handleRotationDebounced();
	}

	/**
	 * Flushes any buffered log records to the file.
	 */
	async flush(): Promise<void> {
		await this.textStreamPrinter?.flush();

		await this.handleRotationDebounced();
	}

	/**
	 * This method is a no-op for FilePrinter.
	 */
	async clear(): Promise<void> {
		await this.textStreamPrinter?.clear();

		await this.handleRotationDebounced();
	}

	/**
	 * Prints a log record to the file.
	 *
	 * @param record The log record to print.
	 */
	async print(record: LoggerRecord): Promise<void> {
		await this.streamPrinterLock.withLock(async () => {
			const textStreamPrinter = await this._unprotected_open();

			await textStreamPrinter.print(record);
		});

		await this.handleRotationDebounced();
	}

	private async _unprotected_open() {
		if (!this.textStreamPrinter) {
			if (!this.fileStream) {
				this.fileStream = await new Promise<WriteStream>((resolve, reject) => {
					const stream = createWriteStream(this.filePath, { flags: "a" });

					const handleOpen = () => {
						stream.removeListener("error", handleError);
						resolve(stream);
					};
					const handleError = (err: unknown) => {
						stream.removeListener("open", handleOpen);
						reject(err);
					};

					stream.once("open", handleOpen);
					stream.once("error", handleError);
				});

				this.fileStream.on("close", () => {
					this.fileStream = null;
					this.textStreamPrinter = null;
				});
			}

			this.textStreamPrinter = new TextStreamPrinter(
				this.fileStream,
				undefined,
				this.options,
			);
		}

		return this.textStreamPrinter;
	}

	private async _unprotected_close() {
		await this.textStreamPrinter?.flush();
		await this.textStreamPrinter?.close();
		this.textStreamPrinter = null;

		const fileStream = this.fileStream;
		this.fileStream = null;

		if (fileStream) {
			await new Promise<void>((resolve, reject) => {
				const handleError = (error: unknown) => {
					reject(error);
				};
				fileStream.once("error", handleError);
				fileStream.end(() => {
					fileStream.removeListener("error", handleError);
					resolve();
				});
			});
		}
	}

	private async handleRotation() {
		return this.handleRotationLock.withLock(async () => {
			const { cutOffFileSize, maxFileAgeMs, useCompression } = this.options;

			if (cutOffFileSize || maxFileAgeMs) {
				let stats: Stats | undefined;
				try {
					stats = await stat(this.filePath);
				} catch {}

				if (
					stats &&
					((cutOffFileSize && stats.size >= cutOffFileSize) ||
						(maxFileAgeMs &&
							Date.now() - stats.mtime.getTime() >= maxFileAgeMs))
				) {
					await this.streamPrinterLock.withLock(async () => {
						await this._unprotected_close();

						await rotateLogFiles(this.filePath, this.options);
					});

					if (useCompression && (await pathExists(`${this.filePath}.1`))) {
						await compressFile(`${this.filePath}.1`);
					}
				}
			}
		});
	}
}
