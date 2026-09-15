import type { IniDocument, IniNode } from "./ast.js";

/** Options for {@link printIniDocument}. */
export type IniPrintDocumentOptions = {
	/** Line terminator. Defaults to `"\n"`. */
	readonly newline?: string;
};

/** Renders one node back to its source line. */
function printNode(node: IniNode): string {
	switch (node.kind) {
		case "blank":
			return node.raw;
		case "comment":
			return `${node.marker}${node.text}`;
		case "section": {
			const comment = node.comment
				? `${node.comment.gap}${node.comment.marker}${node.comment.text}`
				: "";
			return `[${node.raw}]${comment}`;
		}
		default: {
			const comment = node.comment
				? `${node.comment.gap}${node.comment.marker}${node.comment.text}`
				: "";
			return `${node.raw}${comment}`;
		}
	}
}

/**
 * Renders an {@link IniDocument} back to source.
 *
 * Byte-exact for a document that came from {@link parseIniDocument} and was not
 * modified: the tree keeps the raw text of every line, so comments, spacing and
 * section order survive a round trip. That is the property `.editorconfig`
 * resolution and in-place editing both depend on.
 */
export function printIniDocument(
	document: IniDocument,
	options?: IniPrintDocumentOptions,
): string {
	const newline = options?.newline ?? "\n";
	const body = document.nodes.map(printNode).join(newline);
	return document.trailingNewline ? `${body}${newline}` : body;
}
