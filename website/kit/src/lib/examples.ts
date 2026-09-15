import { dedent } from "@ac-kit/core";
import type { Example, ExampleParams } from "examples";

const REGION_START = "#region example";
const REGION_END = "#endregion";

type LoadedExample = {
	/** `<package>/<subject>`, e.g. `math-analysis/gamma`. */
	id: string;
	example: Example<ExampleParams>;
	/** The span the example marked for display, dedented. */
	snippet: string;
};

const MODULES = import.meta.glob<{ default: Example<ExampleParams> }>(
	"../../../../examples/src/**/*.example.ts",
	{ eager: true },
);

const SOURCES = import.meta.glob<string>(
	"../../../../examples/src/**/*.example.ts",
	{ eager: true, query: "?raw", import: "default" },
);

/**
 * The code an example marked for display.
 *
 * Read out of the module's own source rather than re-typed into a page, so what
 * a reader sees is necessarily what ran. A file with no markers shows nothing
 * at all: a silent fallback to the whole file would dump the parameter
 * declarations and the plot spec on the page without anyone noticing.
 */
export function exampleSnippet(source: string): string {
	const start = source.indexOf(REGION_START);
	if (start === -1) {
		return "";
	}
	const bodyStart = source.indexOf("\n", start);
	const end = source.indexOf(REGION_END, bodyStart);
	if (bodyStart === -1 || end === -1) {
		return "";
	}
	const lastNewline = source.lastIndexOf("\n", end);
	return dedent(source.slice(bodyStart + 1, lastNewline)).trim();
}

function idOf(path: string): string {
	const match = /examples\/src\/(.+)\.example\.ts$/.exec(path);
	return match?.[1] ?? path;
}

const EXAMPLES = new Map<string, LoadedExample>();
for (const [path, module] of Object.entries(MODULES)) {
	const id = idOf(path);
	EXAMPLES.set(id, {
		id,
		example: module.default,
		snippet: exampleSnippet(SOURCES[path] ?? ""),
	});
}

/** @throws {RangeError} When no example carries that id. */
export function getExample(id: string): LoadedExample {
	const loaded = EXAMPLES.get(id);
	if (loaded === undefined) {
		throw new RangeError(
			`No example "${id}". Known: ${[...EXAMPLES.keys()].sort().join(", ")}`,
		);
	}
	return loaded;
}

/** Every example belonging to one documented package, in declaration order. */
export function packageExamples(packageName: string): LoadedExample[] {
	return [...EXAMPLES.values()].filter((loaded) =>
		loaded.id.startsWith(`${packageName}/`),
	);
}
