import type {
	AnyRegexNode,
	CharClassItem,
	RegexPattern,
	RegexQuantified,
} from "./ast.js";

const PRINT_METACHARS = new Set([
	".",
	"*",
	"+",
	"?",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	"|",
	"^",
	"$",
	"\\",
]);

function escapeLiteral(char: string): string {
	return PRINT_METACHARS.has(char) ? `\\${char}` : char;
}

function escapeClassChar(char: string): string {
	return char === "]" || char === "\\" || char === "^" ? `\\${char}` : char;
}

function printClassItem(item: CharClassItem): string {
	switch (item.kind) {
		case "char":
			return escapeClassChar(item.char);
		case "range":
			return `${escapeClassChar(item.from)}-${escapeClassChar(item.to)}`;
		case "shorthand":
			return `\\${item.value}`;
	}
}

function printQuantifier(node: RegexQuantified): string {
	const { min, max, lazy } = node;
	let base: string;
	if (min === 0 && max === undefined) base = "*";
	else if (min === 1 && max === undefined) base = "+";
	else if (min === 0 && max === 1) base = "?";
	else if (max === undefined) base = `{${min},}`;
	else if (max === min) base = `{${min}}`;
	else base = `{${min},${max}}`;
	return lazy ? `${base}?` : base;
}

/**
 * Prints an AST node back to pattern text.
 *
 * The grammar guarantees `alternation` nodes only ever appear as
 * `RegexPattern.body` or a `group`'s body, and a `quantified`/`concat`'s
 * children are never themselves `alternation` or `concat` — so no node here
 * ever needs to invent parentheses that weren't already an explicit `group` in
 * the source.
 */
function printNode(node: AnyRegexNode): string {
	switch (node.kind) {
		case "literal":
			return escapeLiteral(node.char);
		case "any":
			return ".";
		case "shorthand":
			return `\\${node.value}`;
		case "anchor":
			return node.type === "start" ? "^" : "$";
		case "charClass":
			return `[${node.negated ? "^" : ""}${node.items.map(printClassItem).join("")}]`;
		case "group":
			return node.capturing
				? `(${printNode(node.body)})`
				: `(?:${printNode(node.body)})`;
		case "alternation":
			return node.alternatives.map(printNode).join("|");
		case "concat":
			return node.items.map(printNode).join("");
		case "quantified":
			return `${printNode(node.body)}${printQuantifier(node)}`;
	}
}

/** Prints a {@link RegexPattern} back to pattern text. */
export function printRegex(pattern: RegexPattern): string {
	return printNode(pattern.body);
}
