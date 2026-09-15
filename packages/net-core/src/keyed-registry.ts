import { ExchangeRegistry } from "./exchange-registry.js";
import { PendingExchange } from "./pending-exchange.js";

export type KeyedRegistryOptions<In, Key> = {
	/**
	 * Extracts the correlation key carried by an inbound frame.
	 *
	 * Returning `undefined` marks the frame as uncorrelated — a server push, a
	 * heartbeat, an event notification — so it is surfaced as unsolicited rather
	 * than mis-attributed to a waiting request.
	 */
	keyOf: (frame: In) => Key | undefined;
};

/**
 * Key-based {@link ExchangeRegistry} for protocols that answer out of order.
 *
 * MQTT packet identifiers, JSON-RPC `id`s, DNS transaction identifiers, RTMP
 * transaction identifiers and AMQP channel identifiers all correlate this way,
 * and none of them can be served by an order-based registry: a response to the
 * third request may legitimately arrive first.
 *
 * @typeParam In - Inbound frame type.
 * @typeParam Key - Correlation key type, anything usable as a `Map` key.
 */
export class KeyedRegistry<In, Key> implements ExchangeRegistry<In, Key> {
	private readonly pending = new Map<Key, PendingExchange<In>>();
	private readonly keys = new Map<PendingExchange<In>, Key>();
	private readonly keyOf: (frame: In) => Key | undefined;

	constructor(options: KeyedRegistryOptions<In, Key>) {
		this.keyOf = options.keyOf;
	}

	get size(): number {
		return this.pending.size;
	}

	/**
	 * Track an exchange under the key the peer will echo back.
	 *
	 * @param exchange The exchange awaiting a response.
	 * @param key The correlation key.
	 * @throws {TypeError} If no key was supplied, since positional matching is
	 *   not meaningful for a protocol that answers out of order.
	 */
	register(exchange: PendingExchange<In>, key?: Key): void {
		if (key === undefined) {
			throw new TypeError(
				"KeyedRegistry requires a correlation key; pass options.key",
			);
		}
		this.pending.set(key, exchange);
		this.keys.set(exchange, key);
	}

	offer(frame: In, body?: ReadableStream<Uint8Array>): boolean {
		const key = this.keyOf(frame);
		if (key === undefined) {
			return false;
		}

		const exchange = this.pending.get(key);
		if (!exchange) {
			return false;
		}

		const disposition = exchange.accept(frame);
		if (disposition === "skip") {
			return false;
		}

		exchange.frames.push(frame);
		if (body && exchange.onBody) {
			exchange.onBody(frame, body);
		}
		if (disposition === "complete") {
			this.pending.delete(key);
			this.keys.delete(exchange);
			exchange.complete();
		}
		return true;
	}

	remove(exchange: PendingExchange<In>): void {
		const key = this.keys.get(exchange);
		if (key === undefined) {
			return;
		}
		this.keys.delete(exchange);
		this.pending.delete(key);
	}

	rejectAll(error: Error): void {
		const outstanding = [...this.pending.values()];
		this.pending.clear();
		this.keys.clear();
		for (const exchange of outstanding) {
			exchange.fail(error);
		}
	}
}
