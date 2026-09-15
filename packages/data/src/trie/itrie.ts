import { DefinedValue } from "@ac-kit/core";

import type { IMap } from "../map/imap.js";

/** Prefix-keyed map over sequences of a caller-chosen segment type `S`. */
export interface ITrie<S, V extends DefinedValue> extends IMap<
	readonly S[],
	V
> {
	withPrefix(
		prefix: readonly S[],
	): IterableIterator<readonly [readonly S[], V]>;
	hasPrefix(prefix: readonly S[]): boolean;
	longestPrefixOf(key: readonly S[]): readonly S[] | undefined;
}
