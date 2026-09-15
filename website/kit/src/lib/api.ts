/**
 * Resolution of a documented symbol to its generated reference page.
 *
 * The reference is emitted by TypeDoc during the build, so the only reliable
 * way to link into it is to look at what was actually emitted. Every link
 * written by hand instead is a link that survives a rename — silently, and
 * pointing at nothing.
 */

// Keys only: the loaders are never called, so nothing is bundled.
const PAGES = import.meta.glob("../content/docs/api/**/*.md");

const PAGE_PATH = /\/api\/([^/]+)\/([^/]+)\/([^/]+)\.md$/;

/** `<package>#<symbol>` to the route segment TypeDoc emitted it at. */
const ROUTES = new Map<string, { kind: string; route: string }>();

for (const path of Object.keys(PAGES)) {
	const match = PAGE_PATH.exec(path);
	if (match === null) {
		continue;
	}
	const [, slug, kind, name] = match;
	ROUTES.set(`${slug}#${name}`, {
		kind: kind as string,
		// Starlight slugifies a page id to lower case, so the emitted file name is
		// not the route: `logBeta.md` is served at `.../functions/logbeta/`.
		route: `api/${slug}/${kind}/${(name as string).toLowerCase()}`,
	});
}

function suggest(pkg: string, name: string): string {
	const lower = name.toLowerCase();
	const near = [...ROUTES.keys()]
		.filter((key) => key.startsWith(`${pkg}#`))
		.map((key) => key.slice(pkg.length + 1))
		.filter((symbol) => symbol.toLowerCase().includes(lower.slice(0, 4)));

	return near.length > 0 ? ` Did you mean: ${near.sort().join(", ")}?` : "";
}

export type ApiSymbol = {
	/** Absolute site path, base included. */
	href: string;
	/** The label to render, with call parentheses when it is a function. */
	label: string;
};

/**
 * Locates the reference page for one exported symbol.
 *
 * @param pkg Package name without the scope, e.g. `math-analysis`.
 * @param name Exported symbol name, exactly as spelled in the source.
 * @throws {ReferenceError} When no reference page was generated for it —
 *   because the symbol was renamed, is no longer exported, or its package ships
 *   no TypeScript. This fails the build rather than emitting a dead link.
 */
export function apiSymbol(pkg: string, name: string): ApiSymbol {
	const entry = ROUTES.get(`${pkg}#${name}`);
	if (entry === undefined) {
		throw new ReferenceError(
			`No generated reference page for "${name}" in ${pkg}.${suggest(pkg, name)}`,
		);
	}

	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	return {
		href: `${base}/${entry.route}/`,
		label: entry.kind === "functions" ? `${name}()` : name,
	};
}

const KIND_LABEL: Readonly<Record<string, string>> = {
	classes: "class",
	enumerations: "enum",
	functions: "function",
	interfaces: "interface",
	"type-aliases": "type",
	variables: "value",
};

export type IndexedSymbol = ApiSymbol & {
	name: string;
	pkg: string;
	/** Human-readable TypeScript kind, e.g. `function`. */
	kind: string;
};

/** Every symbol with a generated reference page, sorted case-insensitively. */
export function allSymbols(): readonly IndexedSymbol[] {
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");

	return [...ROUTES]
		.map(([key, entry]) => {
			const separator = key.indexOf("#");
			const name = key.slice(separator + 1);
			return {
				name,
				pkg: key.slice(0, separator),
				kind: KIND_LABEL[entry.kind] ?? entry.kind,
				href: `${base}/${entry.route}/`,
				label: entry.kind === "functions" ? `${name}()` : name,
			};
		})
		.sort(
			(left, right) =>
				left.name.toLowerCase().localeCompare(right.name.toLowerCase()) ||
				left.pkg.localeCompare(right.pkg),
		);
}

/** Packages whose reference was generated into this build. */
export function documentedPackages(): readonly string[] {
	return [
		...new Set([...ROUTES.keys()].map((key) => key.slice(0, key.indexOf("#")))),
	].sort();
}
