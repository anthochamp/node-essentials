import type {
	Formatter,
	SerializeReportEventOptions,
} from "@ac-kit/app-report";
import {
	SERIALIZE_ERROR_DEFAULT_FN,
	serializeReportEvent,
} from "@ac-kit/app-report";

import type { LogRecord } from "../log-record.js";

/**
 * `Formatter<LogRecord>` rendering newline-delimited JSON, one object per event
 * — built on `serializeReportEvent`, extended to also run `options.error` over
 * a `LogRecord`'s own `error` field (which the generic serializer only
 * special-cases on `scope-end`, not on `data`).
 */
export function jsonLogFormatter(
	options?: SerializeReportEventOptions,
): Formatter<LogRecord> {
	const errorSerializer = options?.error ?? SERIALIZE_ERROR_DEFAULT_FN;

	return (event) => {
		const transformed =
			event.kind === "data"
				? {
						...event,
						data: { ...event.data, error: errorSerializer(event.data.error) },
					}
				: event;

		return JSON.stringify(serializeReportEvent(transformed, options)) ?? null;
	};
}
