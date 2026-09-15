import { DefinedValue } from "@ac-kit/core";

import { IAsyncOrderedRange } from "../ordered-range/iasync-ordered-range.js";
import { IAsyncSet } from "./iasync-set.js";

/** The async-backed sibling of {@link ISortedSet}. */
export interface IAsyncSortedSet<T extends DefinedValue = DefinedValue>
	extends IAsyncSet<T>, IAsyncOrderedRange<T> {}
