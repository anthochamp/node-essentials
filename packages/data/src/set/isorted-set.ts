import { DefinedValue } from "@ac-kit/core";

import { IOrderedRange } from "../ordered-range/iordered-range.js";
import { ISet } from "./iset.js";

/** A set whose iteration order is the comparator's. */
export interface ISortedSet<T extends DefinedValue = DefinedValue>
	extends ISet<T>, IOrderedRange<T> {}
