import { IStorage } from "./istorage.js";

/** O(1) amortised. An implementation that cannot meet it must not declare this. */
export interface IPushFrontStorage<T> extends IStorage<T> {
	pushFront(item: T): void;
	pushFrontAll(items: readonly T[]): void;
}
