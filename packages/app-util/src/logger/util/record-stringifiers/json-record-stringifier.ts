import type { LoggerRecord } from "../../logger-record.js";
import type { LoggerRecordStringifier } from "./record-stringifier.js";

export class JsonLoggerRecordStringifier implements LoggerRecordStringifier {
	stringify(record: LoggerRecord): string {
		// biome-ignore lint/style/noNonNullAssertion: record is always serializable
		return JSON.stringify(record)!;
	}
}
