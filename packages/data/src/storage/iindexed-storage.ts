import { DefinedValue } from "@ac-kit/core";

import { IStorage } from "./istorage.js";

/** O(1). An implementation that cannot meet it must not declare this. */
export interface IIndexedStorage<T extends DefinedValue> extends IStorage<T> {
	get(index: number): T | undefined;
	set(index: number, item: T): void;
}
