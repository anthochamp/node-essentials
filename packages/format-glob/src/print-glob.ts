import type { GlobClassItem, GlobNode, GlobPattern } from "./ast.js";

function printClassItem(item: GlobClassItem): string {
	return item.kind === "char" ? item.char : `${item.from}-${item.to}`;
}

function printNodes(nodes: readonly GlobNode[]): string {
	let out = "";
	for (const node of nodes) {
		switch (node.kind) {
			case "literal":
				out += node.text.replace(/[*?[\]{}\\]/g, "\\$&");
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
 * under any dialect.
 */
export function printGlob(pattern: GlobPattern): string {
	return `${pattern.anchored ? "/" : ""}${printNodes(pattern.nodes)}${
		pattern.directoryOnly ? "/" : ""
	}`;
}
