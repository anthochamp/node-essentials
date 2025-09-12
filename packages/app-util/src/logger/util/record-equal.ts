import { isDeepEqual } from "@ac-essentials/misc-util";
import type { LoggerRecord } from "../logger-record.js";

export function loggerPrinterRecordEqual(
	a: LoggerRecord,
	b: LoggerRecord,
	withTimestamp = true,
): boolean {
	if (withTimestamp) {
		return isDeepEqual(a, b);
	} else {
		const { timestamp: _at, ...aRest } = a;
		const { timestamp: _bt, ...bRest } = b;
		return isDeepEqual(aRest, bRest);
	}
}
