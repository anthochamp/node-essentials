import type { Formatter } from "@ac-kit/app-report";
import { plainLineFormatter } from "@ac-kit/app-report";
import type { SemanticRole } from "@ac-kit/app-terminal";
import { semanticStyle } from "@ac-kit/app-terminal";
import { styleText } from "@ac-kit/format-ansi";

import { LogLevel } from "../log-level.js";
import type { LogRecord } from "../log-record.js";
import { logRecordDetailLines } from "./plain-log-formatter.js";

// `info` reads as `success` because an info line reports that something went
// the way it was supposed to — which is why the level has always been green.
const LOG_LEVEL_ROLE_: Record<LogLevel, SemanticRole> = {
	debug: "muted",
	info: "success",
	warn: "warning",
	error: "error",
	fatal: "critical",
};

/**
 * Renders a `LogRecord`'s level and message as one colored line, plus its
 * attributes/error/stack trace as extra dimmed lines.
 *
 * Non-`"data"` events (scope lifecycle, output, attachments) delegate to
 * `plainLineFormatter`.
 */
export const ansiLogFormatter: Formatter<LogRecord> = (event, context) => {
	if (event.kind !== "data") {
		return plainLineFormatter(event, context);
	}

	const record = event.data;
	const colorDepth = context.terminal?.colorDepth ?? 24;

	const label = styleText(`[${record.level.toUpperCase()}]`, {
		styles: ["bold"],
		...semanticStyle(LOG_LEVEL_ROLE_[record.level]),
		colorDepth,
	});

	const detailLines = logRecordDetailLines(record).map((line) =>
		styleText(line, { styles: ["dim"], colorDepth }),
	);

	return [`${label} ${record.message}`, ...detailLines].join("\n");
};
