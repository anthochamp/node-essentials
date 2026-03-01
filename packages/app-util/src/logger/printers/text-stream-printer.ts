import type * as fs from "node:fs";
import type * as tty from "node:tty";
import { stripVTControlCharacters } from "node:util";
import {
	defaults,
	LockHold,
	Mutex,
	Queue,
	serializeQueueNext,
} from "@ac-essentials/misc-util";
import type { ILoggerPrinter } from "../logger-printer.js";
import type { LoggerRecord } from "../logger-record.js";
import { loggerIsErrorLogLevel } from "../util/is-error-log-level.js";
import { AnsiLoggerRecordStringifier } from "../util/record-stringifiers/ansi-record-stringifier.js";
import type { LoggerRecordStringifier } from "../util/record-stringifiers/record-stringifier.js";

export type TextStreamPrinterOptions = {
	/**
	 * The record stringifier to use to convert log records to strings.
	 * Default is an instance of `AnsiLoggerRecordStringifier`.
	 */
	recordStringifier?: LoggerRecordStringifier;
};

export const TEXT_STREAM_PRINTER_DEFAULT_OPTIONS: Required<TextStreamPrinterOptions> =
	{
		recordStringifier: new AnsiLoggerRecordStringifier(),
	};

export type TextStreamPrinterSpoolItem = {
	isError: boolean;
	data: string;
};

export class TextStreamPrinter implements ILoggerPrinter {
	protected readonly options: Required<TextStreamPrinterOptions>;
	private spool = new Queue<TextStreamPrinterSpoolItem>();
	private readonly spoolLock = new Mutex();
	private readonly flushLock = new Mutex();
	private readonly flushSqn = serializeQueueNext(() => this.flush());

	constructor(
		private readonly defaultStream: tty.WriteStream | fs.WriteStream,
		private readonly errorStream:
			| tty.WriteStream
			| fs.WriteStream
			| null = null,
		options?: TextStreamPrinterOptions,
	) {
		this.options = defaults(options, TEXT_STREAM_PRINTER_DEFAULT_OPTIONS);
	}

	async clear(): Promise<void> {
		{
			await using _flushLock = await LockHold.from([this.flushLock]);

			this.spool.clear();

			this.spool.enqueue({ isError: false, data: "\x1Bc" });
		}

		await this.flushSqn();
	}

	async close(): Promise<void> {
		await this.flush();
	}

	async flush(): Promise<void> {
		await using _flushLock = await LockHold.from([this.flushLock]);

		let spool: Queue<TextStreamPrinterSpoolItem>;
		{
			await using _spoolLock = await LockHold.from([this.spoolLock]);
			spool = this.spool;
			this.spool = new Queue<TextStreamPrinterSpoolItem>();
		}

		let item: TextStreamPrinterSpoolItem | undefined;
		while ((item = spool.dequeue()) !== undefined) {
			try {
				await this.outputSpoolItem(item);
			} catch (error) {
				await using _spoolLock = await LockHold.from([this.spoolLock]);

				// add back the items to the spool if output fails
				this.spool = new Queue(spool.concat(...this.spool));

				throw error;
			}
		}
	}

	async print(record: LoggerRecord): Promise<void> {
		await this.enqueueSpoolItem({
			isError:
				record.logLevel !== null && loggerIsErrorLogLevel(record.logLevel),
			data: this.options.recordStringifier.stringify(record),
		});
	}

	protected async enqueueSpoolItem(
		item: TextStreamPrinterSpoolItem,
	): Promise<void> {
		{
			await using _spoolLock = await LockHold.from([this.spoolLock]);
			this.spool.enqueue(item);
		}

		await this.flushSqn();
	}

	protected async outputSpoolItem(
		item: TextStreamPrinterSpoolItem,
	): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const outputStream =
				item.isError && this.errorStream
					? this.errorStream
					: this.defaultStream;

			let data: string;

			if ("isTTY" in outputStream && outputStream.isTTY) {
				data = item.data;
			} else {
				// remove ANSI escape codes when output is not a TTY
				data = stripVTControlCharacters(item.data);
			}

			outputStream.write(data, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}
}
