import { DefinedValue } from "@ac-kit/core";

import { IAsyncMap } from "../map/iasync-map.js";

/** The async-backed sibling of {@link ITrie}. */
export interface IAsyncTrie<S, V extends DefinedValue> extends IAsyncMap<
	readonly S[],
	V
> {
	withPrefix(
		prefix: readonly S[],
		signal?: AbortSignal,
	): AsyncIterableIterator<readonly [readonly S[], V]>;
	hasPrefix(prefix: readonly S[], signal?: AbortSignal): Promise<boolean>;
	longestPrefixOf(
		key: readonly S[],
		signal?: AbortSignal,
	): Promise<readonly S[] | undefined>;
}
