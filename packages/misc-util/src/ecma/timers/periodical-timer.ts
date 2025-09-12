import { noThrowAsync } from "../function/no-throw.js";
import type { MaybeAsyncCallback } from "../function/types.js";
import { defaults } from "../object/defaults.js";
import { Timer } from "./timer.js";

export type PeriodicalTimerOptions = {
	// whether to tick immediately on start (default: false)
	tickOnStart?: boolean;

	// whether to wait for the previous tick to complete before scheduling the next one (default: false)
	waitForCompletion?: boolean;
};

const PERIODICAL_TIMER_DEFAULT_OPTIONS: Required<PeriodicalTimerOptions> = {
	tickOnStart: false,
	waitForCompletion: false,
};

/**
 * A timer that calls a callback function at regular intervals.
 */
export class PeriodicalTimer {
	private readonly options: Required<PeriodicalTimerOptions>;
	private started = false;
	private readonly nextTickTimer: Timer;

	/**
	 * Constructs a new PeriodicalTimer.
	 *
	 * @param callback The callback function to call at each interval.
	 * @param intervalMs The interval in milliseconds between each tick.
	 * @param options Optional settings for the timer.
	 */
	constructor(
		private readonly callback: MaybeAsyncCallback,
		readonly intervalMs: number,
		options?: PeriodicalTimerOptions,
	) {
		this.options = defaults(options, PERIODICAL_TIMER_DEFAULT_OPTIONS);
		this.nextTickTimer = new Timer(() => this.onTick(), intervalMs);
	}

	/**
	 * Starts the periodical timer. If the timer is already started, this does nothing.
	 */
	start(): void {
		if (this.started) {
			return;
		}

		this.started = true;

		if (this.options.tickOnStart) {
			this.onTick();
		} else {
			this.scheduleNextTick();
		}
	}

	/**
	 * Stops the periodical timer. If the timer is not started, this does nothing.
	 */
	stop(): void {
		this.started = false;
		this.nextTickTimer.cancel();
	}

	/**
	 * Returns whether the timer is currently started.
	 *
	 * @return True if the timer is started, false otherwise.
	 */
	isStarted(): boolean {
		return this.started;
	}

	private scheduleNextTick() {
		if (this.started) {
			this.nextTickTimer.start();
		}
	}

	private onTick() {
		if (this.options.waitForCompletion) {
			noThrowAsync(this.callback)
				.call(undefined)
				.then(() => {
					this.scheduleNextTick();
				});
		} else {
			noThrowAsync(this.callback).call(undefined);
			this.scheduleNextTick();
		}
	}
}
