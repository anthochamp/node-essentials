import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

/**
 * Resolves `rev` (e.g. `"HEAD"`, a branch name, or a short SHA) to its full
 * commit SHA at `options.execOptions.cwd`.
 *
 * @throws {ProcessExitWithOutputError} When `rev` cannot be resolved.
 * @see https://git-scm.com/docs/git-rev-parse
 */
export async function gitRevParse(
	rev: string,
	options?: GitCommandOptions,
): Promise<string> {
	const { stdout } = await execFileAsync("git", ["rev-parse", rev], {
		...options?.execOptions,
		encoding: "utf8",
		signal: options?.signal ?? undefined,
	});

	return stdout.trim();
}
