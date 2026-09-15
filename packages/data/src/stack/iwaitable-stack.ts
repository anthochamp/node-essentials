import { DefinedValue } from "@ac-kit/core";

import { IBounded } from "../collection/ibounded.js";
import { IStack } from "./istack.js";

/**
 * The blocking sibling of {@link IBoundedStack}: waits for capacity instead of
 * throwing when the stack is full. The inherited `push` still throws — this
 * adds a way to wait, it does not change the way to fail.
 */
export interface IWaitableStack<T extends DefinedValue = DefinedValue>
	extends IStack<T>, IBounded {
	/**
	 * Same as `push`, but waits for capacity if the operation would exceed it.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IStack.push
	 */
	waitPush(item: T, signal?: AbortSignal | null): Promise<void>;

	/**
	 * Same as `pushAll`, but waits for capacity if the operation would exceed it.
	 * The whole batch lands at once, never interleaved with another waiter's.
	 *
	 * @param signal Optional abort signal to cancel the operation.
	 * @see IStack.pushAll
	 */
	waitPushAll(items: Iterable<T>, signal?: AbortSignal | null): Promise<void>;
}
