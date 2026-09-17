import { realpath } from "node:fs/promises";
import os from "node:os";
import { basename, dirname, join, parse, resolve, sep } from "node:path";

import { PathEscapeError } from "./path-escape-error.js";

export type PathWithinOptions = {
	/**
	 * Directory a relative `root` or `path` resolves against. Default
	 * `process.cwd()`.
	 */
	readonly from?: string | null;

	/**
	 * Whether the path resolving to the root itself counts as within. Default
	 * `true`.
	 *
	 * Set it to `false` where the root is a container the path must be an entry
	 * of — a destination directory that must not be overwritten by the write it
	 * is receiving.
	 */
	readonly allowRoot?: boolean | null;

	/**
	 * Compares segments case-insensitively. Defaults to `true` on Windows and
	 * `false` everywhere else.
	 *
	 * That default follows the platform's _convention_, not the filesystem's
	 * actual behaviour, which Node cannot report: a macOS volume is usually
	 * case-insensitive, a case-sensitive one can be mounted anywhere, and NTFS
	 * can be made case-sensitive per directory. Where the answer is a security
	 * decision and the volume may be case-insensitive, pass `true` explicitly —
	 * comparing case-sensitively there lets `/Root/../etc` reached as
	 * `/ROOT/../etc` read as a different root.
	 */
	readonly caseInsensitive?: boolean | null;
};

type Resolved_ = {
	readonly root: string;
	readonly path: string;
	readonly allowRoot: boolean;
	readonly caseInsensitive: boolean;
};

/** Absolute path to `[filesystemRoot, ...segments]`, with no empty segment. */
function toSegments_(absolutePath: string): string[] {
	const { root } = parse(absolutePath);
	const rest = absolutePath.slice(root.length);

	return rest.length === 0 ? [root] : [root, ...rest.split(sep)];
}

function isSegmentEqual_(
	left: string,
	right: string,
	caseInsensitive: boolean,
): boolean {
	return caseInsensitive
		? // Not `toLocaleLowerCase`: a Turkish locale would fold the dotless i and
			// make containment depend on the machine's language.
			left.toLowerCase() === right.toLowerCase()
		: left === right;
}

/**
 * Segment-wise containment.
 *
 * A prefix test on the joined strings is the classic bug: `/var/data-evil`
 * starts with `/var/data`. Comparing segments makes the separator implicit
 * instead of something the caller has to remember to append.
 */
function isWithin_(resolved: Resolved_): boolean {
	const rootSegments = toSegments_(resolved.root);
	const pathSegments = toSegments_(resolved.path);

	if (pathSegments.length < rootSegments.length) {
		return false;
	}

	for (let index = 0; index < rootSegments.length; index++) {
		if (
			!isSegmentEqual_(
				rootSegments[index] as string,
				pathSegments[index] as string,
				resolved.caseInsensitive,
			)
		) {
			return false;
		}
	}

	return pathSegments.length > rootSegments.length || resolved.allowRoot;
}

function resolveTextually_(
	root: string,
	path: string,
	options: PathWithinOptions | undefined,
): Resolved_ {
	const from = options?.from ?? ".";

	return {
		// `resolve` normalizes `.` and `..`, drops a trailing separator, and
		// ignores `from` for an input that is already absolute.
		root: resolve(from, root),
		path: resolve(from, path),
		allowRoot: options?.allowRoot ?? true,
		caseInsensitive: options?.caseInsensitive ?? os.platform() === "win32",
	};
}

/**
 * `realpath` of the longest existing prefix, with the missing tail appended.
 *
 * A path being checked before it is created has nothing to resolve, and
 * `realpath` reports that as `ENOENT` for the whole path rather than for the
 * part that is missing. Anything else — a permission error, a symlink loop — is
 * rethrown, so a check never answers "within" because it could not look.
 */
async function realpathPartial_(target: string): Promise<string> {
	const missing: string[] = [];
	let current = target;

	for (;;) {
		try {
			const existing = await realpath(current);
			return missing.length === 0
				? existing
				: join(existing, ...missing.reverse());
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== "ENOENT" && code !== "ENOTDIR") {
				throw error;
			}

			const parent = dirname(current);
			if (parent === current) {
				return target;
			}

			missing.push(basename(current));
			current = parent;
		}
	}
}

async function resolveReally_(
	root: string,
	path: string,
	options: PathWithinOptions | undefined,
): Promise<Resolved_> {
	const textual = resolveTextually_(root, path, options);
	const [realRoot, realPath] = await Promise.all([
		realpathPartial_(textual.root),
		realpathPartial_(textual.path),
	]);

	return { ...textual, root: realRoot, path: realPath };
}

/**
 * Whether `path` stays inside `root`, comparing the two as resolved sequences
 * of path segments.
 *
 * Both are resolved first, so `..`, `.`, a trailing separator and a relative
 * input all behave as the filesystem would read them. Containment is then
 * decided segment by segment, which is why `/var/data-evil` is not inside
 * `/var/data` — a `startsWith` test on the joined strings says it is. The path
 * being the root itself counts as within unless
 * {@link PathWithinOptions.allowRoot} says otherwise.
 *
 * **This answers a question about strings, not about the filesystem.** A
 * symbolic link inside the root pointing out of it resolves within textually
 * and reads outside it in practice; {@link isPathWithinAsync} is the variant
 * that follows links.
 *
 * Time and memory are linear in the length of the two paths.
 *
 * @example
 * 	```ts
 * 	isPathWithin("/var/data", "/var/data/a/b"); // true
 * 	isPathWithin("/var/data", "/var/data-evil/x"); // false
 * 	isPathWithin("/var/data", "/var/data/a/../../etc/passwd"); // false
 * 	isPathWithin("/var/data", "/var/data", { allowRoot: false }); // false
 * 	```;
 *
 * @param root The directory the path must stay inside.
 * @param path The path to check.
 * @param options Resolution base, root-equality and case-folding policy.
 * @returns True if the resolved path is inside the resolved root.
 */
export function isPathWithin(
	root: string,
	path: string,
	options?: PathWithinOptions,
): boolean {
	return isWithin_(resolveTextually_(root, path, options));
}

/**
 * Whether `path` stays inside `root` once both are resolved through symbolic
 * links.
 *
 * Resolves each with `realpath`, falling back to the longest existing prefix
 * when the path does not exist yet, then applies the segment comparison
 * {@link isPathWithin} describes. A link inside the root pointing out of it is
 * therefore reported as outside.
 *
 * **Resolving is not opening, and the gap between them is exploitable.** A path
 * that answers `true` here can be replaced by a symbolic link before the caller
 * opens it — the check and the use are two syscalls, and nothing holds the
 * filesystem still between them. Where that matters, open the file first and
 * validate the handle (`fd`-relative operations, `O_NOFOLLOW`), or make the
 * root a directory an attacker cannot write to. This function narrows the
 * window; it does not close it.
 *
 * Costs one `realpath` per path, plus one per missing ancestor when the path
 * does not exist.
 *
 * @param root The directory the path must stay inside.
 * @param path The path to check.
 * @param options Resolution base, root-equality and case-folding policy.
 * @returns A promise for whether the real path is inside the real root.
 * @throws Error Any filesystem error other than a missing path — a check that
 *   could not look never answers "within".
 */
export async function isPathWithinAsync(
	root: string,
	path: string,
	options?: PathWithinOptions,
): Promise<boolean> {
	return isWithin_(await resolveReally_(root, path, options));
}

/**
 * Require that `path` stays inside `root`, and hand back the resolved path.
 *
 * Returning the resolved path is the point: a caller that resolves again to use
 * it opens a second window in which the answer could change, and a caller that
 * uses its original relative input has not used the thing that was checked.
 *
 * Same textual semantics as {@link isPathWithin}, symbolic links included.
 *
 * @param root The directory the path must stay inside.
 * @param path The path to check.
 * @param options Resolution base, root-equality and case-folding policy.
 * @returns The resolved absolute path.
 * @throws PathEscapeError If the resolved path is outside the resolved root.
 */
export function assertPathWithin(
	root: string,
	path: string,
	options?: PathWithinOptions,
): string {
	const resolved = resolveTextually_(root, path, options);

	if (!isWithin_(resolved)) {
		throw new PathEscapeError(resolved.root, resolved.path);
	}

	return resolved.path;
}

/**
 * Require that `path` stays inside `root` once both are resolved through
 * symbolic links, and hand back the real path.
 *
 * Same semantics and the same TOCTOU caveat as {@link isPathWithinAsync}; use
 * the returned path rather than the argument, so the value opened is the value
 * that was checked.
 *
 * @param root The directory the path must stay inside.
 * @param path The path to check.
 * @param options Resolution base, root-equality and case-folding policy.
 * @returns A promise for the real absolute path.
 * @throws PathEscapeError If the real path is outside the real root.
 */
export async function assertPathWithinAsync(
	root: string,
	path: string,
	options?: PathWithinOptions,
): Promise<string> {
	const resolved = await resolveReally_(root, path, options);

	if (!isWithin_(resolved)) {
		throw new PathEscapeError(resolved.root, resolved.path);
	}

	return resolved.path;
}
