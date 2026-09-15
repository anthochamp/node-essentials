import { IStorage } from "./istorage.js";

/** O(1) amortised. An implementation that cannot meet it must not declare this. */
export interface IPushBackStorage<T> extends IStorage<T> {
	pushBack(item: T): void;
	pushBackAll(items: Iterable<T>): void;
}
