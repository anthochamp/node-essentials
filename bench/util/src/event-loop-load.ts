import { busyWaitSync } from "@ac-kit/test-util";

/** Milliseconds of CPU burned per scheduled slice. */
const SLICE_MS = 2;

/**
 * Keeps the event loop busy until stopped.
 *
 * Timer benchmarks run on an idle loop measure a best case nobody experiences:
 * the loop only checks its timer list once per iteration, so lateness is
 * bounded below by whatever else is already queued. Measuring a condition both
 * idle and loaded, and comparing the two, shows how much of the result belongs
 * to the runtime rather than to the timer.
 */
export class EventLoopLoad {
	private running = false;
	private handle: NodeJS.Immediate | null = null;

	start(): void {
		if (this.running) {
			return;
		}
		this.running = true;
		this.schedule();
	}

	stop(): void {
		this.running = false;
		if (this.handle) {
			clearImmediate(this.handle);
			this.handle = null;
		}
	}

	private schedule(): void {
		if (!this.running) {
			return;
		}
		this.handle = setImmediate(() => {
			busyWaitSync(SLICE_MS);
			this.schedule();
		});
	}
}
