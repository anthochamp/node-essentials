/**
 * The async-backed sibling of {@link ICollection}.
 *
 * Every member mirrors its sync counterpart; the only additions are `Promise`
 * wrapping and an optional `AbortSignal`, since anything that waits on I/O must
 * be cancellable. Declared to prove the design composes — no concrete
 * implementation exists yet.
 *
 * @template T The type of elements in the collection. Anything except
 *   `undefined`.
 */

export interface IAsyncCollection<T> extends AsyncIterable<T> {
	count(signal?: AbortSignal): Promise<number>;

	clear(signal?: AbortSignal): Promise<void>;
}
