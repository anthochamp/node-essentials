import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

/**
 * Checks out `ref` (a branch, tag, or commit SHA) into the working tree at
 * `options.execOptions.cwd`.
 *
 * @see https://git-scm.com/docs/git-checkout
 */
export async function gitCheckout(
	ref: string,
	options?: GitCommandOptions,
): Promise<void> {
	await execFileAsync("git", ["checkout", "--quiet", ref], {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}
