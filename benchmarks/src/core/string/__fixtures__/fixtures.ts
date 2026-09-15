import assert from "assert";

import { durationCase } from "@ac-bench/measure-duration";
import { hashString, randomUint32Values } from "@ac-bench/util";

const WORDS = [
	"user",
	"HTTPResponse",
	"parse-XML-document",
	"already_snake_case",
	"XMLHttpRequest",
	"éléphant blanc",
	"v2 API endpoint",
	"read file sync",
];

/** 2 000 identifier-ish strings, deliberately awkward. */
export const IDENTIFIERS = randomUint32Values(2_000).map(
	(value, index) =>
		`${WORDS[value % WORDS.length]}-${WORDS[index % WORDS.length]}${value % 1000}`,
);

export const SENTENCE = `${"Le vif renard brun saute par-dessus le chien paresseux. ".repeat(20)}Ça coûte 12 €.`;

export const PARAGRAPH = Array.from(
	{ length: 200 },
	(_, index) => `line ${index}: ${SENTENCE.slice(0, 60)}`,
).join("\n");

export const COLLATOR = new Intl.Collator(undefined, { sensitivity: "base" });

/**
 * Registers one bench case that applies `convert` to every identifier and
 * checks the digest did not change between runs.
 *
 * Contenders disagree on edge cases (acronyms, digits), so the expected digest
 * is taken from each contender's own first run. This measures cost, not
 * agreement.
 */
export function caseCase(
	name: string,
	kind: string,
	convert: (input: string) => string,
): void {
	const digest = (): number => {
		let hash = 0x811c9dc5;
		for (const identifier of IDENTIFIERS) {
			hash = (hash ^ hashString(convert(identifier))) >>> 0;
		}
		return hash;
	};
	const wanted = digest();
	durationCase(name, { tags: { kind } }, () =>
		assert.strictEqual(digest(), wanted),
	);
}
