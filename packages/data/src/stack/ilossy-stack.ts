import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IStack } from "./istack.js";

/**
 * The lossy sibling of {@link IStack}: never throws or waits when a bounded
 * stack is full, evicting or skipping instead (`overflowPolicy`).
 *
 * `"evict"` drops the bottom item to make room — the top must stay intact,
 * since a stack's whole contract is LIFO access to what was pushed most
 * recently.
 */
export interface ILossyStack<T extends DefinedValue = DefinedValue>
	extends IStack<T>, ILossy {
	/**
	 * Same as `IStack.push`, but never throws — returns the items dropped to make
	 * room (empty if nothing was dropped).
	 *
	 * @see IStack.push
	 */
	push(item: T): readonly T[];

	/**
	 * Same as `IStack.pushAll`, but never throws — returns the items dropped to
	 * make room (empty if nothing was dropped).
	 *
	 * @see IStack.pushAll
	 */
	pushAll(items: readonly T[]): readonly T[];
}
