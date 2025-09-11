import {
	defaults,
	MS_PER_MINUTE,
	MS_PER_SECOND,
	PeriodicalTimer,
} from "@ac-essentials/misc-util";
import type { ILoggerPrinter } from "../logger-printer.js";
import type { LoggerRecord } from "../logger-record.js";

export type IdleMarkPrinterProxyOptions = {
	// The time to wait before printing an idle mark.
	idleMarkDelayMs?: number;
};

const IDLE_MARK_PRINTER_PROXY_OPTIONS: Required<IdleMarkPrinterProxyOptions> = {
	idleMarkDelayMs: 20 * MS_PER_MINUTE,
};

export class IdleMarkPrinterProxy implements ILoggerPrinter {
	private readonly options: Required<IdleMarkPrinterProxyOptions>;
	private lastNonIdleTime = Date.now();
	private periodicalTimer: PeriodicalTimer;

	constructor(
		private readonly printer: ILoggerPrinter,
		options?: IdleMarkPrinterProxyOptions,
	) {
		this.options = defaults(options, IDLE_MARK_PRINTER_PROXY_OPTIONS);

		this.periodicalTimer = new PeriodicalTimer(
			() => this.handleTimerTick(),
			MS_PER_SECOND,
		);
		this.periodicalTimer.start();
	}

	close(): Promise<void> | void {
		this.periodicalTimer.stop();

		return this.printer.close();
	}

	async clear(): Promise<void> {
		await this.printer.clear();

		this.resetNonIdleTimer();
	}

	async print(record: LoggerRecord): Promise<void> {
		await this.printer.print(record);

		this.resetNonIdleTimer();
	}

	flush(): Promise<void> | void {
		return this.printer.flush();
	}

	private resetNonIdleTimer() {
		this.lastNonIdleTime = Date.now();
	}

	private async handleTimerTick() {
		const now = Date.now();

		if (
			this.lastNonIdleTime === null ||
			now - this.lastNonIdleTime >= this.options.idleMarkDelayMs
		) {
			await this.printer.print({
				timestamp: now,
				message: "MARK",
				metadata: {},
				logLevel: null,
				stackTrace: null,
			});

			this.resetNonIdleTimer();
		}
	}
}
