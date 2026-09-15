import { ReportScopeStatus } from "../events.js";

const SEVERITY_ORDER_ = [
	"failed",
	"cancelled",
	"skipped",
	"ok",
] as const satisfies readonly ReportScopeStatus[];

/**
 * Combines several scope statuses into one overall status most severe wins
 * (`failed` > `cancelled` > `skipped` > `ok`). An empty input is `"ok"`.
 */
export function aggregateScopeStatus(
	statuses: Iterable<ReportScopeStatus>,
): ReportScopeStatus {
	let mostSevereIndex = SEVERITY_ORDER_.length - 1;

	for (const status of statuses) {
		const index = SEVERITY_ORDER_.indexOf(status);
		if (index < mostSevereIndex) {
			mostSevereIndex = index;
		}
	}

	return SEVERITY_ORDER_[mostSevereIndex] as ReportScopeStatus;
}
