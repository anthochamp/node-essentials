import { DefinedValue } from "@ac-kit/core";

import { IStorage } from "./istorage.js";

/** O(1). An implementation that cannot meet it must not declare this. */
export interface IPopBackStorage<T extends DefinedValue> extends IStorage<T> {
	popBack(): T | undefined;
	back(): T | undefined;
}
