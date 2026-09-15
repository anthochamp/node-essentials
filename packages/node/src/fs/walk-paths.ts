import type { Dirent } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { join, matchesGlob, resolve, sep } from "node:path";

/**
 * Selects paths during a walk.
 *
 * A glob and a regular expression are both tested against the `/`-separated
 * path relative to the walk's root; a predicate additionally receives the
 * directory entry, whose kind is already known and costs no extra syscall.
 *
 * Only a glob carries depth information. That is what lets
 * {@link WalkPathsOptions.descend} default itself, and it is why an `include`
 * predicate costs a full walk: a predicate cannot be asked whether anything
 * under a directory could match, so nothing can be pruned on its behalf.
 */
export type PathFilter =
	| string
	| RegExp
	| ((entry: Dirent, path: string) => boolean);

/** What a walk does when a directory cannot be read. */
export type UnreadablePolicy =
	/** Any unreadable directory aborts the walk. */
	| "throw"
	/** The root must be readable; an unreadable directory below it is skipped. */
	| "require-root"
	/** Nothing throws — an unreadable root simply yields nothing. */
	| "skip";

export type WalkPathsOptions = {
	/** Directory the walk starts from, and paths are relative to. Default `"."`. */
	readonly root?: string | null;

	/** Yields only the paths matching one of these. Default: every path. */
	readonly include?: PathFilter | readonly PathFilter[] | null;

	/**
	 * Drops the matching paths, and never descends into a matching directory.
	 * This is the pruning knob: an excluded subtree costs nothing.
	 */
	readonly exclude?: PathFilter | readonly PathFilter[] | null;

	/**
	 * Which directories to descend into.
	 *
	 * Defaults to `true` when any `include` glob contains `**`, and to `false`
	 * otherwise — a regular expression or a predicate says nothing about depth,
	 * so it stays flat. An explicit value always wins over that default.
	 */
	readonly descend?: boolean | PathFilter | null;

	/** Hard depth cap; `1` is the root's own entries. Default: unbounded. */
	readonly maxDepth?: number | null;

	/**
	 * Descends through symbolic links to directories. Default `false`.
	 *
	 * Enabling it costs a `stat` and a `realpath` per symlink encountered, which
	 * is what makes a link back to an ancestor detectable instead of endless.
	 */
	readonly followSymlinks?: boolean | null;

	/** Default `"require-root"`. */
	readonly unreadable?: UnreadablePolicy | null;

	readonly signal?: AbortSignal | null;
};

export type WalkedPath = {
	/** Path relative to the root, always `/`-separated. */
	path: string;

	entry: Dirent;
};

type WalkContext_ = {
	readonly root: string;
	readonly include: readonly PathFilter[];
	readonly exclude: readonly PathFilter[];
	readonly descend: boolean | PathFilter;
	readonly maxDepth: number;
	readonly followSymlinks: boolean;
	readonly unreadable: UnreadablePolicy;
	readonly signal: AbortSignal | null;
};

function matchesFilter_(
	filter: PathFilter,
	entry: Dirent,
	path: string,
): boolean {
	if (typeof filter === "function") {
		return filter(entry, path);
	}
	if (typeof filter === "string") {
		return matchesGlob(path, filter);
	}
	// `search` over `test`: it ignores `lastIndex`, so a caller's `/g` pattern
	// cannot make the filter stateful.
	return path.search(filter) !== -1;
}

function matchesAny_(
	filters: readonly PathFilter[],
	entry: Dirent,
	path: string,
): boolean {
	for (let index = 0; index < filters.length; index++) {
		if (matchesFilter_(filters[index] as PathFilter, entry, path)) {
			return true;
		}
	}
	return false;
}

function toFilterList_(
	filter: PathFilter | readonly PathFilter[] | null | undefined,
): readonly PathFilter[] {
	if (filter === null || filter === undefined) {
		return [];
	}
	if (
		typeof filter === "string" ||
		typeof filter === "function" ||
		filter instanceof RegExp
	) {
		return [filter];
	}
	return filter;
}

function compareByName_(left: Dirent, right: Dirent): number {
	if (left.name < right.name) {
		return -1;
	}
	return left.name > right.name ? 1 : 0;
}

/** `null` when the directory is unreadable and the policy tolerates it. */
async function readEntries_(
	context: WalkContext_,
	relativeDirectory: string,
): Promise<Dirent[] | null> {
	const isRoot = relativeDirectory === "";

	try {
		const entries = await readdir(
			isRoot ? context.root : join(context.root, relativeDirectory),
			{ withFileTypes: true },
		);
		// Sorted per directory so a walk is reproducible across filesystems.
		return entries.sort(compareByName_);
	} catch (error) {
		if (
			context.unreadable === "throw" ||
			(context.unreadable === "require-root" && isRoot)
		) {
			throw error;
		}
		return null;
	}
}

function shouldDescend_(
	context: WalkContext_,
	entry: Dirent,
	path: string,
): boolean {
	if (typeof context.descend === "boolean") {
		return context.descend;
	}
	return matchesFilter_(context.descend, entry, path);
}

/**
 * The resolved path to descend into, or `null` when the entry is not a
 * directory, is a link that would loop, or cannot be inspected.
 */
async function resolveChildDirectory_(
	context: WalkContext_,
	entry: Dirent,
	path: string,
	resolvedDirectory: string,
): Promise<string | null> {
	if (!entry.isSymbolicLink()) {
		return entry.isDirectory() ? join(resolvedDirectory, entry.name) : null;
	}
	if (!context.followSymlinks) {
		return null;
	}

	const absolute = join(context.root, path);
	let target: string;
	try {
		if (!(await stat(absolute)).isDirectory()) {
			return null;
		}
		target = await realpath(absolute);
	} catch (error) {
		if (context.unreadable === "throw") {
			throw error;
		}
		return null;
	}

	// A link resolving to an ancestor would walk its own subtree forever.
	if (
		resolvedDirectory === target ||
		resolvedDirectory.startsWith(target + sep)
	) {
		return null;
	}
	return target;
}

async function* walkDirectory_(
	context: WalkContext_,
	relativeDirectory: string,
	resolvedDirectory: string,
	depth: number,
): AsyncGenerator<WalkedPath> {
	const entries = await readEntries_(context, relativeDirectory);
	if (entries === null) {
		return;
	}

	const prefix = relativeDirectory === "" ? "" : `${relativeDirectory}/`;

	for (const entry of entries) {
		context.signal?.throwIfAborted();

		const path = prefix + entry.name;
		if (matchesAny_(context.exclude, entry, path)) {
			continue;
		}
		if (
			context.include.length === 0 ||
			matchesAny_(context.include, entry, path)
		) {
			yield { path, entry };
		}

		if (depth >= context.maxDepth || !shouldDescend_(context, entry, path)) {
			continue;
		}

		const child = await resolveChildDirectory_(
			context,
			entry,
			path,
			resolvedDirectory,
		);
		if (child !== null) {
			yield* walkDirectory_(context, path, child, depth + 1);
		}
	}
}

/**
 * Streams the paths under a directory, filtered by globs, regular expressions
 * or predicates.
 *
 * Paths are yielded relative to the root, `/`-separated on every platform, and
 * sorted within each directory. Because one traversal tests every filter, a
 * path is yielded once no matter how many patterns it matches — no
 * deduplication needed. Stop early by breaking out of the loop; the generator's
 * cleanup runs as usual.
 *
 * Depth comes from the patterns, as it does in a shell: `"*.ts"` stays flat,
 * `"**\/*.ts"` recurses. {@link WalkPathsOptions.descend} overrides that, and
 * is the only way to recurse with a regular expression or a predicate.
 *
 * Time complexity: one `readdir` per directory descended into, and one filter
 * test per entry visited. `exclude` is applied before descending, so an
 * excluded subtree is never read.
 *
 * @example
 * 	Every `.bench.ts` outside `node_modules`
 * 	```ts
 * 	for await (const { path } of walkPaths({
 * 	include: "**\/*.bench.ts",
 * 	exclude: "**\/node_modules/**",
 * 	})) {
 * 	console.log(path);
 * 	}
 * 	```
 *
 * @example
 * 	The CPU directories of sysfs, tolerating an absent tree
 * 	```ts
 * 	const names = await Array.fromAsync(
 * 	walkPaths({
 * 	root: "/sys/devices/system/cpu",
 * 	include: /^cpu\d+$/,
 * 	unreadable: "skip",
 * 	}),
 * 	(walked) => walked.path,
 * 	);
 * 	```
 *
 * @param options Root, filters, depth, symlink and error handling. See
 *   {@link WalkPathsOptions}.
 * @returns The matching paths, each with the directory entry it came from.
 * @throws When a directory cannot be read and
 *   {@link WalkPathsOptions.unreadable} does not tolerate it.
 */
export async function* walkPaths(
	options?: WalkPathsOptions,
): AsyncGenerator<WalkedPath> {
	const include = toFilterList_(options?.include);
	const root = resolve(options?.root ?? ".");
	const followSymlinks = options?.followSymlinks ?? false;
	const unreadable = options?.unreadable ?? "require-root";

	const context: WalkContext_ = {
		root,
		include,
		exclude: toFilterList_(options?.exclude),
		descend:
			options?.descend ??
			include.some(
				(filter) => typeof filter === "string" && filter.includes("**"),
			),
		maxDepth: options?.maxDepth ?? Number.POSITIVE_INFINITY,
		followSymlinks,
		unreadable,
		signal: options?.signal ?? null,
	};

	// The ancestor check compares resolved paths, so the root has to be one too.
	let resolvedRoot = root;
	if (followSymlinks) {
		try {
			resolvedRoot = await realpath(root);
		} catch (error) {
			if (unreadable !== "skip") {
				throw error;
			}
			return;
		}
	}

	yield* walkDirectory_(context, "", resolvedRoot, 1);
}
