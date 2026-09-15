import { dfs } from "@ac-kit/algo";

import type { DataValue } from "./ast.js";
import { CborWalkControl } from "./index.js";

export {
	DfsWalkContinue as CborWalkContinue,
	DfsWalkControl as CborWalkControl,
	DfsWalkSkipChildren as CborWalkSkipChildren,
	DfsWalkStop as CborWalkStop,
} from "@ac-kit/algo";

/** Called for each node visited by {@link walkDataValue}. */
export type DataValueVisitor = (node: DataValue) => CborWalkControl | undefined;

function childrenOf(node: DataValue): Iterable<DataValue> | undefined {
	switch (node.kind) {
		case "array":
			return node.items;
		case "map":
			return node.entries.flatMap(([key, value]) => [key, value]);
		case "tag":
			return [node.value];
		default:
			return undefined;
	}
}

/** Walks a {@link DataValue} tree in pre-order. */
export function walkDataValue(
	root: DataValue,
	visitor: DataValueVisitor,
): boolean {
	return dfs(root, { childrenOf, onEnter: visitor });
}
