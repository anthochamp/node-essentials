import { DefinedValue } from "@ac-kit/core";

import { IReplacing } from "../collection/ireplacing.js";
import { IAsyncMap } from "./iasync-map.js";

/** The async-backed sibling of {@link IReplacingMap}. */
export interface IAsyncReplacingMap<K, V extends DefinedValue>
	extends Omit<IAsyncMap<K, V>, "set">, IReplacing {
	set(
		key: K,
		value: V,
		signal?: AbortSignal,
	): Promise<readonly (readonly [K, V])[]>;
}
