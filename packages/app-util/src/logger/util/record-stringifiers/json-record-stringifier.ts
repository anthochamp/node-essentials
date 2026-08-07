import type { LoggerRecord } from "../../logger-record.js";
import type { LoggerRecordStringifier } from "./record-stringifier.js";

export class JsonLoggerRecordStringifier implements LoggerRecordStringifier {
	stringify(record: LoggerRecord): string {
		return JSON.stringify(record)!;
	}
}
