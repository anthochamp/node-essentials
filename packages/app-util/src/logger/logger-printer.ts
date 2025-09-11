import type { LoggerRecord } from "./logger-record.js";

export interface ILoggerPrinter {
	/**
	 * If the printer is linked to a TTY, clear the console.
	 */
	clear(): Promise<void> | void;

	/**
	 * Print a log record.
	 *
	 * @param record The log record to output
	 */
	print(record: LoggerRecord): Promise<void> | void;

	/**
	 * Flush any buffered output.
	 */
	flush(): Promise<void> | void;

	/**
	 * Close the printer and release any resources.
	 */
	close(): Promise<void> | void;
}
