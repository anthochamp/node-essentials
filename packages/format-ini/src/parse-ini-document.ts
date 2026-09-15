import type { IniDocument, IniInlineComment, IniNode, IniSpan } from "./ast.js";

/** How permissive the INI grammar is about constructs with no single spec. */
export type IniParseOptions = {
	/**
	 * Whether `;` and `#` start a comment part-way through a line.
	 *
	 * Off by default: an unquoted `#` is a legal value character in many real
	 * files (colour literals, URLs with fragments), and treating it as a comment
	 * silently truncates them. Turn it on for a dialect that specifies it.
	 */
	readonly inlineComments?: boolean;
};

const COMMENT_MARKERS_ = new Set([";", "#"]);

/**
 * Removes one layer of matching surrounding quotes, and resolves the escapes a
 * quoted value may contain.
 */
function unquote(text: string): string {
	const quote = text[0];
	if (
		text.length < 2 ||
		(quote !== '"' && quote !== "'") ||
		text[text.length - 1] !== quote
	) {
		return text;
	}
	const inner = text.slice(1, -1);
	return quote === "'"
		? inner
		: inner.replace(/\\(["\\nrt])/g, (_match, char: string) => {
				switch (char) {
					case "n":
						return "\n";
					case "r":
						return "\r";
					case "t":
						return "\t";
					default:
						return char;
				}
			});
}

/** Splits a trailing comment off a line, honouring quotes. */
function splitInlineComment(
	text: string,
	enabled: boolean,
): { body: string; comment?: IniInlineComment } {
	if (!enabled) {
		return { body: text };
	}

	let quote: string | undefined;
	for (let index = 0; index < text.length; index++) {
		const char = text[index]!;
		if (quote) {
			if (char === "\\") {
				index += 1;
			} else if (char === quote) {
				quote = undefined;
			}
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}
		if (COMMENT_MARKERS_.has(char)) {
			const body = text.slice(0, index);
			const trimmed = body.replace(/\s+$/, "");
			return {
				body: trimmed,
				comment: {
					marker: char as ";" | "#",
					text: text.slice(index + 1),
					gap: body.slice(trimmed.length),
				},
			};
		}
	}
	return { body: text };
}

/**
 * Parses INI source into a lossless {@link IniDocument}.
 *
 * The grammar accepted is the permissive union of what real INI files contain:
 * both `;` and `#` comment markers, `[section]` headers, `key = value` and
 * valueless `key`, single- or double-quoted values, and blank lines. Nothing is
 * rejected — a line that matches no rule is kept as a property with the whole
 * line as its key — because an INI parser that throws is unusable against the
 * variety of files that call themselves INI.
 *
 * Interpretation is deliberately left to the caller: duplicate keys, dotted key
 * nesting and type coercion are decisions a consumer makes over this tree, not
 * decisions the syntax can settle.
 */
export function parseIniDocument(
	source: string,
	options?: IniParseOptions,
): IniDocument {
	const inlineComments = options?.inlineComments ?? false;
	const nodes: IniNode[] = [];
	const trailingNewline = source.endsWith("\n");
	// The terminator is a property of the document, not a line of its own.
	const body = trailingNewline
		? source.slice(0, source.endsWith("\r\n") ? -2 : -1)
		: source;

	if (body.length === 0 && !trailingNewline) {
		return { nodes, trailingNewline };
	}

	let offset = 0;
	for (;;) {
		let lineEnd = body.indexOf("\n", offset);
		if (lineEnd === -1) {
			lineEnd = body.length;
		}
		// A CRLF file must not leave the CR inside the value.
		const contentEnd =
			lineEnd > offset && body[lineEnd - 1] === "\r" ? lineEnd - 1 : lineEnd;
		const line = body.slice(offset, contentEnd);

		nodes.push(
			parseLine(line, { start: offset, end: contentEnd }, inlineComments),
		);

		if (lineEnd === body.length) {
			break;
		}
		offset = lineEnd + 1;
	}

	return { nodes, trailingNewline };
}

function parseLine(
	line: string,
	span: IniSpan,
	inlineComments: boolean,
): IniNode {
	const trimmedStart = line.replace(/^\s+/, "");

	if (trimmedStart.length === 0) {
		return { kind: "blank", raw: line, span };
	}

	const marker = trimmedStart[0]!;
	if (COMMENT_MARKERS_.has(marker)) {
		return {
			kind: "comment",
			marker: marker as ";" | "#",
			text: trimmedStart.slice(1),
			span,
		};
	}

	if (trimmedStart.startsWith("[")) {
		const close = trimmedStart.lastIndexOf("]");
		if (close > 0) {
			const raw = trimmedStart.slice(1, close);
			const rest = trimmedStart.slice(close + 1);
			const { comment } = splitInlineComment(
				rest,
				inlineComments || rest.length > 0,
			);
			return {
				kind: "section",
				name: unquote(raw.trim()),
				raw,
				...(comment ? { comment } : {}),
				span,
			};
		}
	}

	const { body, comment } = splitInlineComment(line, inlineComments);
	const equals = body.indexOf("=");

	if (equals === -1) {
		return {
			kind: "property",
			key: body.trim(),
			value: undefined,
			raw: body,
			...(comment ? { comment } : {}),
			span,
		};
	}

	return {
		kind: "property",
		key: body.slice(0, equals).trim(),
		value: unquote(body.slice(equals + 1).trim()),
		raw: body,
		...(comment ? { comment } : {}),
		span,
	};
}
