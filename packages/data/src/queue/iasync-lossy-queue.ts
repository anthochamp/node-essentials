import { DefinedValue } from "@ac-kit/core";

import { ILossy } from "../collection/ilossy.js";
import { IAsyncQueue } from "./iasync-queue.js";

/**
 * The async-backed sibling of {@link ILossyQueue}. Unlike blocking, eviction
 * observability survives the collapse to async: `Promise<readonly T[]>` is
 * genuinely different information from bare `Promise<void>` — the evicted items
 * are real data, not just timing — so this sibling is legitimate where
 * `IAsyncBlockingQueue` would not be.
 */
export interface IAsyncLossyQueue<T extends DefinedValue = DefinedValue>
	extends Omit<IAsyncQueue<T>, "enqueue" | "enqueueAll">, ILossy {
	enqueue(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	enqueueAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;
}
