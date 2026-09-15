import { IReplacing } from "../collection/ireplacing.js";
import { IAsyncSet } from "./iasync-set.js";

/** The async-backed sibling of {@link IReplacingSet}. */
export interface IAsyncReplacingSet<T>
	extends Omit<IAsyncSet<T>, "add" | "addAll">, IReplacing {
	add(item: T, signal?: AbortSignal): Promise<readonly T[]>;

	addAll(items: Iterable<T>, signal?: AbortSignal): Promise<readonly T[]>;
}
