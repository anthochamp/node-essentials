import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

export type GitFetchOptions = GitCommandOptions & {
	/**
	 * Object filter passed to `--filter`, e.g. `"blob:none"` to omit blob objects
	 * until a later checkout needs them.
	 *
	 * @see https://git-scm.com/docs/git-fetch#Documentation/git-fetch.txt---filterltfilter-specgt
	 */
	filter?: string;

	/**
	 * Shallow-fetch depth passed to `--depth` — only the history needed to
	 * resolve `refspec` is transferred.
	 *
	 * @see https://git-scm.com/docs/git-fetch#Documentation/git-fetch.txt---depthltdepthgt
	 */
	depth?: number;
};

/**
 * Fetches `refspec` (a branch, tag, or full commit SHA the remote exposes,
 * reachable or not) from `remote` into the object store at
 * `options.execOptions.cwd`.
 *
 * @see https://git-scm.com/docs/git-fetch
 */
export async function gitFetch(
	remote: string,
	refspec: string,
	options?: GitFetchOptions,
): Promise<void> {
	const args = ["fetch", "--quiet"];

	if (options?.filter !== undefined) {
		args.push(`--filter=${options.filter}`);
	}
	if (options?.depth !== undefined) {
		args.push(`--depth=${options.depth}`);
	}

	args.push(remote, refspec);

	await execFileAsync("git", args, {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}
