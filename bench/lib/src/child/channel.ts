import {
	BENCH_PROTOCOL_VERSION,
	ChildMessage,
	DiscoveredCondition,
} from "@ac-bench/core/runner";
import { ReportScopeStatus } from "@ac-kit/app-report";

/** How far the child may run ahead of the parent's acknowledgements. */
const ACK_WINDOW = 256;

export type ChildMessagePoster = (
	message: ChildMessage,
) => Promise<void> | void;

/**
 * The child's end of the protocol: assigns the sequence numbers the parent
 * asserts on, and stops sending once it has run too far ahead of the last
 * acknowledgement.
 */
export class ChildChannel {
	private seq = 0;
	private lastAck = 0;
	private credit: PromiseWithResolvers<void> | null = null;
	private released = false;

	constructor(
		private readonly post: ChildMessagePoster,
		private readonly ackWindow: number = ACK_WINDOW,
	) {}

	acknowledge(seq: number): void {
		this.lastAck = Math.max(this.lastAck, seq);

		if (this.credit !== null && this.seq - this.lastAck <= this.ackWindow) {
			this.credit.resolve();
			this.credit = null;
		}
	}

	/** Unblocks anything waiting on credit, so an abort cannot hang the child. */
	release(): void {
		this.released = true;
		this.credit?.resolve();
		this.credit = null;
	}

	hello(): Promise<void> | void {
		return this.post({
			t: "hello",
			version: BENCH_PROTOCOL_VERSION,
			pid: process.pid,
		});
	}

	conditions(conditions: DiscoveredCondition[]): Promise<void> | void {
		return this.post({ t: "conditions", conditions });
	}

	async event(event: unknown): Promise<void> {
		await this.waitForCredit();

		this.seq += 1;
		await this.post({ t: "event", seq: this.seq, event });
	}

	dropped(count: number, kinds: string[]): Promise<void> | void {
		this.seq += 1;
		return this.post({ t: "dropped", seq: this.seq, count, kinds });
	}

	done(status: ReportScopeStatus): Promise<void> | void {
		this.seq += 1;
		return this.post({ t: "done", seq: this.seq, status });
	}

	fatal(error: unknown): Promise<void> | void {
		this.seq += 1;
		return this.post({ t: "fatal", seq: this.seq, error });
	}

	private waitForCredit(): Promise<void> {
		if (this.released || this.seq - this.lastAck <= this.ackWindow) {
			return Promise.resolve();
		}

		this.credit ??= Promise.withResolvers<void>();

		return this.credit.promise;
	}
}
