import type { ReportEvent, ReportScopeStatus } from "../events.js";
import type { ISink, SinkProbe } from "../sink.js";
import { aggregateScopeStatus } from "../util/aggregate-scope-status.js";
import { ScopeTracker } from "../util/scope-tracker.js";

export type ExitCodeSinkOptions = {
	/** Statuses that produce a non-zero exit code. Default `["failed"]`. */
	failOn?: readonly ReportScopeStatus[];

	/** Exit code used when the aggregate status is `"cancelled"`. Default `130`. */
	cancelledExitCode?: number;
};

/**
 * Derives a process exit status from the observed root scopes' statuses.
 *
 * Nothing in this pipeline swallows a failed run's outcome any more: the caller
 * reads {@link ExitCodeSink.exitCode} and sets `process.exitCode` itself, rather
 * than a sink silently absorbing it.
 */
export class ExitCodeSink<TData> implements ISink<TData> {
	private readonly scopeTracker = new ScopeTracker();
	private readonly failOn: ReadonlySet<ReportScopeStatus>;
	private readonly cancelledExitCode: number;

	constructor(options?: ExitCodeSinkOptions) {
		this.failOn = new Set(options?.failOn ?? ["failed"]);
		this.cancelledExitCode = options?.cancelledExitCode ?? 130;
	}

	enabled(_probe: SinkProbe): boolean {
		return true;
	}

	write(event: ReportEvent<TData>): void {
		this.scopeTracker.observe(event);
	}

	flush(): void {}

	close(): void {}

	/** The aggregate status across every root scope observed so far. */
	status(): ReportScopeStatus {
		return aggregateScopeStatus(
			this.scopeTracker.roots().map((record) => record.status ?? "cancelled"),
		);
	}

	/** The process exit code derived from {@link status}. */
	exitCode(): number {
		const status = this.status();

		if (status === "cancelled") {
			return this.cancelledExitCode;
		}

		return this.failOn.has(status) ? 1 : 0;
	}
}
