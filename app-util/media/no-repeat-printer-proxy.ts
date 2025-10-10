import {
	debounceQueue,
	defaults,
	MS_PER_SECOND,
	Mutex,
	PeriodicalTimer,
	Queue,
} from "@ac-essentials/misc-util";
import type { ILoggerPrinter } from "../logger-printer.js";
import type { LoggerRecord } from "../logger-record.js";
import { loggerPrinterRecordEqual } from "../util/record-equal.js";

export type NoRepeatPrinterProxyOptions = {
	// The max time to wait before printing a repeated message again after it
	// stops repeating (and no other message have been received since).
	maxDelayMs?: number;

	// The maximum number of times to hide a repeated message before printing
	// it again.
	maxCount?: number;
};

const NO_REPEAT_PRINTER_PROXY_OPTIONS: Required<NoRepeatPrinterProxyOptions> = {
	maxDelayMs: 5 * MS_PER_SECOND,
	maxCount: 200,
};

/**
 * A logger printer proxy that suppresses repeated messages, printing a summary
 * message instead.
 */
export class NoRepeatPrinterProxy implements ILoggerPrinter {
	private readonly options: Required<NoRepeatPrinterProxyOptions>;
	private lastRecord: LoggerRecord | null = null;
	private lastRecordSkipCount = 0;
	private periodicalTimer: PeriodicalTimer;
	private spool = new Queue<LoggerRecord>();
	private readonly spoolLock = new Mutex();
	private readonly flushLock = new Mutex();
	private readonly flushDebounced = debounceQueue(() => this.flush());
	private readonly handleRepeatCountLock = new Mutex();

	/**
	 * Creates a new NoRepeatPrinterProxy.
	 *
	 * @param printer The underlying printer to proxy to.
	 * @param options Options for the proxy.
	 */
	constructor(
		private readonly printer: ILoggerPrinter,
		options?: NoRepeatPrinterProxyOptions,
	) {
		this.options = defaults(options, NO_REPEAT_PRINTER_PROXY_OPTIONS);

		this.periodicalTimer = new PeriodicalTimer(
			async () => this.handleTimerTick(),
			MS_PER_SECOND,
			{
				waitForCompletion: true,
			},
		);
		this.periodicalTimer.start();
	}

	close(): Promise<void> | void {
		this.periodicalTimer.stop();

		return this.printer.close();
	}

	clear(): Promise<void> | void {
		this.lastRecord = null;
		this.lastRecordSkipCount = 0;

		return this.printer.clear();
	}

	async flush(): Promise<void> {
		return this.flushLock.withLock(async () => {
			const spool = await this.spoolLock.withLock(() => {
				const originalSpool = this.spool;
				this.spool = new Queue<LoggerRecord>();
				return originalSpool;
			});

			let record: LoggerRecord | undefined;
			while ((record = spool.dequeue()) !== undefined) {
				try {
					await this.handleRecordPrint(record);
				} catch (error) {
					// add back the item to the spool if output fails
					await this.spoolLock.withLock(() => {
						this.spool = new Queue(spool.concat(...this.spool));
					});

					throw error;
				}
			}

			return this.printer.flush();
		});
	}

	async print(record: LoggerRecord): Promise<void> {
		await this.spoolLock.withLock(() => {
			this.spool.enqueue(record);
		});

		await this.flushDebounced();
	}

	private async handleRecordPrint(record: LoggerRecord) {
		const skipPrint = await this.handleRepeatCountLock.withLock(async () => {
			let recordEqual: boolean = false;
			if (this.lastRecord) {
				recordEqual = loggerPrinterRecordEqual(record, this.lastRecord, false);
			}

			const counterResetted = await this._unprotected_handleRepeatCount(
				!recordEqual,
			);

			this.lastRecord = record;

			const shouldSkipPrint = recordEqual && !counterResetted;

			if (shouldSkipPrint) {
				this.lastRecordSkipCount++;
			}

			return shouldSkipPrint;
		});

		if (!skipPrint) {
			await this.printer.print(record);
		}
	}

	private async handleTimerTick() {
		await this.handleRepeatCountLock.withLock(async () => {
			await this._unprotected_handleRepeatCount();
		});
	}

	private async _unprotected_handleRepeatCount(forceReset = false) {
		if (this.lastRecord && this.lastRecordSkipCount > 0) {
			const now = Date.now();

			if (
				forceReset ||
				now - this.lastRecord.timestamp >= this.options.maxDelayMs ||
				this.lastRecordSkipCount >= this.options.maxCount
			) {
				await this.printer.print({
					timestamp: now,
					message: `last message repeated ${this.lastRecordSkipCount} time(s)`,
					metadata: {},
					logLevel: null,
					stackTrace: null,
				});

				this.lastRecordSkipCount = 0;

				return true;
			}
		}

		return false;
	}
}
