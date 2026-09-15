import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IAsyncPriorityQueue } from "./iasync-priority-queue.js";

/** The async-backed sibling of {@link ILossyPriorityQueue}. */
export interface IAsyncLossyPriorityQueue<
	T extends DefinedValue = DefinedValue,
	P = number,
>
	extends Omit<IAsyncPriorityQueue<T, P>, "insert" | "insertAll">, ILossy {
	insert(priority: P, item: T, signal?: AbortSignal): Promise<readonly T[]>;

	insertAll(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal,
	): Promise<readonly T[]>;
}
