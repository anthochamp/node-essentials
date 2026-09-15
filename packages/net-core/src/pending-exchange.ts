/**
 * How a pending exchange classifies an inbound frame.
 *
 * - `accumulate` — the frame belongs to this exchange; keep waiting.
 * - `complete` — the frame belongs to this exchange and ends it.
 * - `skip` — the frame is not part of this exchange; offer it to the next
 *   candidate, or fall through to unsolicited handling.
 *
 * `skip` is what makes uncorrelated protocols expressible. IRC interleaves
 * `PRIVMSG` and `PING` with the numeric replies to whatever command is
 * outstanding, and only the exchange itself knows which is which.
 */
export type Disposition = "accumulate" | "complete" | "skip";

/** Classifies inbound frames for one pending exchange. */
export type ExchangeAccept<In> = (frame: In) => Disposition;

/**
 * One outstanding request awaiting its response frames.
 *
 * Created by a session and held by an {@link ExchangeRegistry} until it
 * completes, is abandoned, or the connection fails.
 */
export class PendingExchange<In> {
	/** Frames accepted so far, in arrival order. */
	readonly frames: In[] = [];

	/**
	 * Set when the caller abandoned the exchange under the `discard` policy.
	 *
	 * The exchange stays registered so it can absorb the response that is still
	 * in flight, but its result is thrown away instead of delivered.
	 */
	orphaned = false;

	private settled = false;

	constructor(
		readonly accept: ExchangeAccept<In>,
		private readonly resolve: (frames: In[]) => void,
		private readonly reject: (error: Error) => void,
		readonly onBody?: (frame: In, body: ReadableStream<Uint8Array>) => void,
	) {}

	/** Whether this exchange has already resolved or rejected. */
	get isSettled(): boolean {
		return this.settled;
	}

	/** Deliver the collected frames, unless the exchange was orphaned. */
	complete(): void {
		if (this.settled) {
			return;
		}
		this.settled = true;
		if (!this.orphaned) {
			this.resolve(this.frames);
		}
	}

	/**
	 * Fail the exchange.
	 *
	 * @param error The reason to reject with.
	 */
	fail(error: Error): void {
		if (this.settled) {
			return;
		}
		this.settled = true;
		if (!this.orphaned) {
			this.reject(error);
		}
	}
}
