import { DefinedValue } from "@ac-kit/core";

import { IStorage } from "./istorage.js";

/** O(1). An implementation that cannot meet it must not declare this. */
export interface IPopFrontStorage<T extends DefinedValue> extends IStorage<T> {
	popFront(): T | undefined;
	front(): T | undefined;
}
