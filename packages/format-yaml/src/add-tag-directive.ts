import * as yaml from "yaml";

/**
 * Ensures every document in `source` declares `handle` as a `%TAG` prefix,
 * returning the updated source.
 *
 * A `%TAG` directive is per-document and must precede that document's `---`, so
 * a handle cannot be injected once for a multi-document stream: each document
 * is inspected and patched on its own. A document already declaring the same
 * handle, or the same prefix under a different handle, is left alone.
 *
 * Existing document boundaries, directives and comments are preserved; a `...`
 * end marker is inserted where the YAML grammar requires one before a directive
 * that follows another document. An empty `source` yields a single empty
 * document carrying the directive.
 *
 * Linear in the token count of `source`, over one `yaml.Parser` pass.
 *
 * @param source YAML source text.
 * @param handle Tag handle to ensure, e.g. `"!inv!"`.
 * @param prefix Tag prefix the handle expands to, e.g.
 *   `"tag:example.com,2024:"`.
 */
export function addYamlTagDirective(
	source: string,
	handle: string,
	prefix: string,
): string {
	if (source.trim() === "") {
		return `%TAG ${handle} ${prefix}\n---\n`;
	}

	const directiveLine = `%TAG ${handle} ${prefix}\n`;
	const tokens = Array.from(new yaml.Parser().parse(source));

	// Applied in reverse so an earlier insertion cannot shift a later offset.
	const insertions: { offset: number; text: string }[] = [];

	for (const [index, token] of tokens.entries()) {
		if (token.type !== "document") {
			continue;
		}

		const docStartToken = token.start.find((item) => item.type === "doc-start");
		const docStartOffset = docStartToken?.offset ?? token.offset;

		let hasHandle = false;
		let hasPrefix = false;
		let lastDirectiveEndOffset: number | null = null;
		let foundExplicitDocEnd = false;
		let foundDocBoundary = false;
		let isPreviousDocStartMarkerOnly = false;

		// Walk back to this document's own directives, stopping at its predecessor.
		for (let j = index - 1; j >= 0; j--) {
			const previous = tokens[j];
			if (previous === undefined) {
				break;
			}

			if (previous.type === "doc-end") {
				foundExplicitDocEnd = true;
				foundDocBoundary = true;
				break;
			}
			if (previous.type === "document") {
				foundDocBoundary = true;
				const previousDocStart = previous.start.find(
					(item) => item.type === "doc-start",
				);
				if (previousDocStart !== undefined && !previous.value) {
					isPreviousDocStartMarkerOnly = true;
				}
				break;
			}
			if (
				previous.type !== "directive" ||
				!previous.source.startsWith("%TAG ")
			) {
				continue;
			}

			if (previous.source.startsWith(`%TAG ${handle} `)) {
				hasHandle = true;
			}
			if (/^%TAG\s+\S+\s+(.+)$/.exec(previous.source)?.[1] === prefix) {
				hasPrefix = true;
			}
			const directiveEnd = previous.offset + previous.source.length;
			if (
				lastDirectiveEndOffset === null ||
				directiveEnd > lastDirectiveEndOffset
			) {
				lastDirectiveEndOffset = directiveEnd;
			}
		}

		if (hasHandle || hasPrefix) {
			continue;
		}

		if (lastDirectiveEndOffset !== null) {
			// Join the existing directive block rather than opening a second one.
			const directiveEnd = lastDirectiveEndOffset;
			const newlinesAfterDirective = token.start.filter(
				(item) =>
					item.type === "newline" &&
					item.offset > directiveEnd &&
					item.offset < docStartOffset,
			);
			let insertOffset = directiveEnd;
			if (source[insertOffset] === "\n") {
				insertOffset++;
			}
			for (const _ of newlinesAfterDirective) {
				if (source[insertOffset] === "\n") {
					insertOffset++;
				}
			}
			insertions.push({ offset: insertOffset, text: directiveLine });
		} else if (
			foundDocBoundary &&
			!foundExplicitDocEnd &&
			!isPreviousDocStartMarkerOnly
		) {
			// A directive after another document needs an explicit end marker first.
			insertions.push({
				offset: docStartOffset,
				text: `...\n${directiveLine}`,
			});
		} else {
			insertions.push({ offset: docStartOffset, text: directiveLine });
		}

		if (docStartToken === undefined) {
			// Directives oblige the document to open with an explicit `---`.
			insertions.push({
				offset: docStartOffset,
				text: docStartOffset >= source.length ? "\n---\n" : "---\n",
			});
		}
	}

	let result = source;
	for (const insertion of insertions.reverse()) {
		result =
			result.slice(0, insertion.offset) +
			insertion.text +
			result.slice(insertion.offset);
	}
	return result;
}
