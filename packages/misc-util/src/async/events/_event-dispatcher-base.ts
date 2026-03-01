import { PriorityQueue } from "../../data/priority-queue.js";
import { noThrow } from "../../ecma/function/no-throw.js";
import type { Callable } from "../../ecma/function/types.js";
import type {
	EventDispatcherSubscribeOptions,
	EventDispatcherWaitOptions,
	IEventDispatcher,
} from "./ievent-dispatcher.js";

export class EventDispatcherBase<T extends unknown[] = never[]>
	implements IEventDispatcher<T>
{
	private readonly subscribers = new Map<Callable<T>, Callable<T>>();
	private queueSeq = 0;
	private readonly queue = new PriorityQueue<Callable<T>, [number, number]>(
		undefined,
		undefined,
		(a, b) => {
			const [ap, aseq] = a;
			const [bp, bseq] = b;
			if (ap !== bp) {
				return ap < bp;
			}
			return aseq < bseq;
		},
	);

	subscribe(
		subscriber: Callable<T>,
		options?: EventDispatcherSubscribeOptions,
	): Callable | null {
		if (!this.subscribers.has(subscriber)) {
			const priority = options?.priority ?? 0;

			if (options?.once) {
				this.subscribers.set(subscriber, (...args: T) => {
					this.subscribers.delete(subscriber);
					this.queue.removeFirst(([v]) => v === subscriber);

					noThrow(subscriber).apply(undefined, args);
				});
			} else {
				this.subscribers.set(subscriber, subscriber);
			}
			this.queue.insert([-priority, this.queueSeq++], subscriber);

			return () => this.unsubscribe(subscriber);
		}

		return null;
	}

	unsubscribe(subscriber: Callable<T>): void {
		this.subscribers.delete(subscriber);
	}

	isSubscribed(subscriber: Callable<T>): boolean {
		return this.subscribers.has(subscriber);
	}

	async wait(options?: EventDispatcherWaitOptions<T>): Promise<T> {
		const deferred = Promise.withResolvers<T>();

		const unsubscribe = this.subscribe((...args: T) => {
			if (!options?.predicate || options?.predicate(...args)) {
				deferred.resolve(args);
			}
		});

		const handleAbort = () => {
			deferred.reject(options?.signal?.reason);
		};

		let event: T;
		try {
			options?.signal?.throwIfAborted();
			options?.signal?.addEventListener("abort", handleAbort, {
				once: true,
			});

			event = await deferred.promise;
		} finally {
			options?.signal?.removeEventListener("abort", handleAbort);
			unsubscribe?.();
		}

		return event;
	}

	protected dispatch(...args: T): void {
		for (const [subscriber] of this.queue) {
			const wrapped = this.subscribers.get(subscriber);
			if (!wrapped) {
				continue;
			}
			noThrow(wrapped).apply(undefined, args);
		}
	}
}
