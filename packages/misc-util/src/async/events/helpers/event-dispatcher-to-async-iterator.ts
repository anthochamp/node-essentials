import type { IEventDispatcher } from "../ievent-dispatcher.js";

/**
 * Creates an async iterator over events emitted by the given {@link IEventDispatcher}.
 *
 * Each time the dispatcher emits an event, the iterator yields the event arguments
 * as an array.
 *
 * @example
 * ```ts
 * const dispatcher = new EventDispatcher<[number, string]>();
 *
 * async function consumeEvents() {
 *     for await (const [num, str] of eventDispatcherToAsyncIterator(dispatcher)) {
 *         console.log(`Received event with number: ${num} and string: ${str}`);
 *     }
 * }
 *
 * consumeEvents();
 *
 * dispatcher.dispatch(1, "first");
 * dispatcher.dispatch(2, "second");
 * ```
 *
 * @param dispatcher The event dispatcher to convert into an async iterator.
 * @returns An async iterable that yields event arguments as arrays.
 */
export function eventDispatcherToAsyncIterator<T extends unknown[]>(
	dispatcher: IEventDispatcher<T>,
): AsyncIterable<T> {
	const queue: T[] = [];
	let nextIteratorResult: ((value: IteratorResult<T>) => void) | null = null;

	dispatcher.subscribe((...args: T) => {
		if (nextIteratorResult) {
			const resolve = nextIteratorResult;
			nextIteratorResult = null;
			resolve({ value: args, done: false });
		} else {
			queue.push(args);
		}
	});

	return {
		[Symbol.asyncIterator](): AsyncIterator<T> {
			return {
				next: () => {
					if (queue.length > 0) {
						const value = queue.shift() as T;
						return Promise.resolve({ value, done: false });
					}

					return new Promise<IteratorResult<T>>((resolve) => {
						nextIteratorResult = resolve;
					});
				},
			};
		},
	};
}
