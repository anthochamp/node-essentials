import { dfs } from "@ac-kit/algo";

import type { AnyRegexNode } from "./ast.js";
import { RegexWalkControl } from "./index.js";

export {
	DfsWalkContinue as RegexWalkContinue,
	DfsWalkControl as RegexWalkControl,
	DfsWalkSkipChildren as RegexWalkSkipChildren,
	DfsWalkStop as RegexWalkStop,
} from "@ac-kit/algo";

/** Called for each node visited by {@link walkRegex}. */
export type RegexNodeVisitor = (
	node: AnyRegexNode,
) => RegexWalkControl | undefined;

function childrenOf(node: AnyRegexNode): Iterable<AnyRegexNode> | undefined {
	switch (node.kind) {
		case "literal":
		case "any":
		case "shorthand":
		case "anchor":
		case "charClass":
			return undefined;
		case "group":
		case "quantified":
			return [node.body];
		case "alternation":
			return node.alternatives;
		case "concat":
			return node.items;
	}
}

/** Walks a regex AST in pre-order. */
export function walkRegex(
	root: AnyRegexNode,
	visitor: RegexNodeVisitor,
): boolean {
	return dfs(root, { childrenOf, onEnter: visitor });
}
