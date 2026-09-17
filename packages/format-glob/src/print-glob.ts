import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";

function printClassItem(item: GlobClassItem): string {
	switch (item.kind) {
		case "char":
			return item.char;
		case "span":
			return `${item.from}-${item.to}`;
		default:
			return `[:${item.name}:]`;
	}
}

/**
 * Every character that introduces a construct in some dialect.
 *
 * `(`, `)` and `|` are on it because an extglob is `@(a|b)`: escaping the paren
 * is what stops a literal `@(` from becoming a group when the printed pattern
 * is read back under `"bash"`.
 */
const LITERAL_ESCAPE_ = /[*?[\]{}()|\\]/g;

function printNodes(nodes: readonly GlobNode[]): string {
	let out = "";
	for (const node of nodes) {
		switch (node.kind) {
			case "literal":
				out += node.text.replace(LITERAL_ESCAPE_, "\\$&");
				break;
			case "separator":
				out += "/";
				break;
			case "any-char":
				out += "?";
				break;
			case "star":
				out += "*";
				break;
			case "globstar":
				out += "**";
				break;
			case "class":
				out += `[${node.negated ? "!" : ""}${node.items.map(printClassItem).join("")}]`;
				break;
			case "alternation":
				out += `{${node.branches.map(printNodes).join(",")}}`;
				break;
			case "extglob":
				out += `${node.operator}(${node.branches.map(printNodes).join("|")})`;
				break;
			default:
				out += `{${node.from}..${node.to}}`;
				break;
		}
	}
	return out;
}

/**
 * Renders a parsed pattern back to glob source.
 *
 * Round-trips the constructs the dialect gave meaning to; anything that parsed
 * as literal text comes back escaped, so the printed form means the same thing
 * under any dialect. Literal text opening with `!` or `#` is escaped for the
 * same reason — under `"bash"` those two positions are pattern negation and a
 * comment, not text.
 */
export function printGlob(pattern: GlobPattern): string {
	if (pattern.comment !== null) {
		return `#${pattern.comment}`;
	}

	const first = pattern.nodes[0];
	const opensWithDirective =
		first?.kind === "literal" &&
		(first.text.startsWith("!") || first.text.startsWith("#"));

	return `${pattern.negated ? "!" : ""}${pattern.anchored ? "/" : ""}${
		opensWithDirective ? "\\" : ""
	}${printNodes(pattern.nodes)}${pattern.directoryOnly ? "/" : ""}`;
}
