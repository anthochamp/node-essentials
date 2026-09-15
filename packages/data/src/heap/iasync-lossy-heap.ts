import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IAsyncHeap } from "./iasync-heap.js";

/** The async-backed sibling of {@link ILossyHeap}. */
export interface IAsyncLossyHeap<T extends DefinedValue = DefinedValue>
	extends Omit<IAsyncHeap<T>, "insert" | "insertAll">, ILossy {
	insert(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	insertAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;
}
