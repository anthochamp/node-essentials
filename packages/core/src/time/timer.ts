import { catchOutOfBandAsync } from "../function/no-throw.js";
import type { Callable } from "../types/callable.js";

/** A reusable timer that calls a callback function after a specified delay. */
export class Timer {
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Constructs a new Timer.
	 *
	 * @param callback The function to call when the timer fires.
	 * @param delayMs The delay in milliseconds before the timer fires.
	 */
	constructor(
		private readonly callback: Callable,
		private readonly delayMs: number,
	) {}

	/**
	 * Returns whether the timer is currently active (i.e., has been started and
	 * not yet fired or canceled).
	 *
	 * @returns True if the timer is active, false otherwise.
	 */
	isActive(): boolean {
		return this.timeoutId !== null;
	}

	/** Starts the timer. If the timer is already active, this does nothing. */
	start(): void {
		if (this.timeoutId !== null) {
			return;
		}

		this.timeoutId = setTimeout(() => this.onTick(), this.delayMs);
	}

	/** Cancels the timer. If the timer is not active, this does nothing. */
	cancel(): void {
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	/** Restarts the timer. If the timer is not active, this starts it. */
	restart(): void {
		this.cancel();
		this.start();
	}

	private onTick() {
		this.timeoutId = null;

		void catchOutOfBandAsync(this.callback);
	}
}
