import type { LoggerRecord } from "../../logger-record.js";

export interface LoggerRecordStringifier {
	stringify(record: LoggerRecord): string;
}
