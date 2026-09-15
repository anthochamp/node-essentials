import { ExchangeRegistry } from "./exchange-registry.js";
import { PendingExchange } from "./pending-exchange.js";

export interface ScanningRegistryOptions {
	/**
	 * How many outstanding exchanges an inbound frame may be offered to before it
	 * is treated as unsolicited.
	 *
	 * - `1` — strict FIFO. Correct for protocols where responses are guaranteed to
	 *   arrive in request order: SMTP, LMTP, POP3, Postfix socketmap.
	 * - `Infinity` — opportunistic. Correct for protocols where several commands
	 *   may be outstanding with no correlation key and unrelated traffic can
	 *   arrive between them, such as IRC.
	 *
	 * Defaults to `1`, the conservative choice: a frame that no exchange should
	 * have claimed is better surfaced as unsolicited than mis-attributed.
	 */
	maxDepth?: number;
}

/**
 * Order-based {@link ExchangeRegistry}.
 *
 * Offers each inbound frame to outstanding exchanges from oldest to newest,
 * stopping at the first that does not return `skip`, and giving up after
 * {@link ScanningRegistryOptions.maxDepth} candidates.
 *
 * Strict FIFO is the depth-1 case rather than a separate implementation, which
 * keeps the two behaviours from drifting apart.
 */
export class ScanningRegistry<In> implements ExchangeRegistry<In, never> {
	private readonly pending: Array<PendingExchange<In>> = [];
	private readonly maxDepth: number;

	constructor(options?: ScanningRegistryOptions) {
		this.maxDepth = options?.maxDepth ?? 1;
	}

	get size(): number {
		return this.pending.length;
	}

	/** Correlation is positional here, so any supplied key is ignored. */
	register(exchange: PendingExchange<In>): void {
		this.pending.push(exchange);
	}

	offer(frame: In, body?: ReadableStream<Uint8Array>): boolean {
		const limit =
			this.maxDepth < this.pending.length ? this.maxDepth : this.pending.length;

		for (let index = 0; index < limit; index++) {
			const exchange = this.pending[index]!;
			const disposition = exchange.accept(frame);
			if (disposition === "skip") {
				continue;
			}

			exchange.frames.push(frame);
			if (body && exchange.onBody) {
				exchange.onBody(frame, body);
			}
			if (disposition === "complete") {
				this.pending.splice(index, 1);
				exchange.complete();
			}
			return true;
		}

		return false;
	}

	remove(exchange: PendingExchange<In>): void {
		const index = this.pending.indexOf(exchange);
		if (index !== -1) {
			this.pending.splice(index, 1);
		}
	}

	rejectAll(error: Error): void {
		const outstanding = this.pending.splice(0);
		for (const exchange of outstanding) {
			exchange.fail(error);
		}
	}
}
