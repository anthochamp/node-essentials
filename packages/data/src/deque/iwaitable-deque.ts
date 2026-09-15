import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IDeque } from "./ideque.js";

/**
 * The blocking sibling of {@link IDeque}: waits for capacity when the deque is
 * full. The inherited `unshift`/`push` throws — this adds a way to wait, it
 * does not change the way to fail.
 */
export interface IWaitableDeque<T extends DefinedValue = DefinedValue>
	extends IDeque<T>, IBounded {
	/**
	 * Same as `unshift`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IDeque.unshift
	 */
	waitUnshift(item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `unshiftAll`, but waits for capacity if the operation would exceed
	 * it. The whole batch lands at once, never interleaved with another
	 * waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IDeque.unshiftAll
	 */
	waitUnshiftAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void>;

	/**
	 * Same as `push`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IDeque.push
	 */
	waitPush(item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `pushAll`, but waits for capacity if the operation would exceed it.
	 * The whole batch lands at once, never interleaved with another waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IDeque.pushAll
	 */
	waitPushAll(items: Iterable<T>, signal?: AbortSignal | null): Promise<void>;
}
