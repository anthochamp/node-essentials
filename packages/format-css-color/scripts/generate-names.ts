/**
 * Regenerates `src/names/<locale>.ts` from `locale/<locale>.po`.
 *
 * Run with `yarn workspace @ac-kit/format-css-color run generate:names` after
 * editing a catalogue. The output is committed: it is derived from a source
 * that lives in this repository, not downloaded, so a fresh clone must be able
 * to build without running anything first.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePo, parsePoHeader } from "@ac-kit/format-po";

import { cssNamedColorNames } from "../src/named-colors.js";

const PACKAGE_ = fileURLToPath(new URL("..", import.meta.url));
const LOCALE_DIRECTORY_ = join(PACKAGE_, "locale");
const OUTPUT_DIRECTORY_ = join(PACKAGE_, "src", "names");

async function generate(file: string): Promise<void> {
	const locale = basename(file, ".po");
	const entries = parsePo(
		await readFile(join(LOCALE_DIRECTORY_, file), "utf8"),
	);
	const known = cssNamedColorNames();

	const labels: [string, string][] = [];
	for (const entry of entries) {
		if (entry.obsolete || entry.id === "" || entry.strings[0] === undefined) {
			continue;
		}
		if (entry.strings[0] === "") {
			continue;
		}
		if (!known.has(entry.id)) {
			throw new Error(`${file}: ${entry.id} is not a CSS colour keyword`);
		}
		labels.push([entry.id, entry.strings[0]]);
	}

	const declared = parsePoHeader(entries).get("language");
	if (declared !== undefined && declared !== locale) {
		throw new Error(
			`${file}: header declares ${declared} but the file is named ${locale}`,
		);
	}

	const rows = labels
		.map(
			([id, label]) => `\t[${JSON.stringify(id)}, ${JSON.stringify(label)}],`,
		)
		.join("\n");

	const source = `// Generated from locale/${file} by scripts/generate-names.ts. Do not edit.

import type { CssColorLabels } from "../color-labels.js";

/** The language tag these labels were written for. */
export const LOCALE = ${JSON.stringify(locale)};

export const CSS_COLOR_LABELS: CssColorLabels = new Map([
${rows}
]);
`;

	await writeFile(join(OUTPUT_DIRECTORY_, `${locale}.ts`), source, "utf8");
	process.stdout.write(`${locale}: ${labels.length} labels\n`);
}

const files = (await readdir(LOCALE_DIRECTORY_)).filter((file) =>
	file.endsWith(".po"),
);
await Promise.all(files.map(generate));
