import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

export type GitSparseCheckoutInitOptions = GitCommandOptions & {
	/**
	 * Use cone mode — directory-scoped patterns instead of full gitignore-style
	 * patterns.
	 */
	cone?: boolean;
};

/**
 * Enables sparse-checkout for the repository at `options.execOptions.cwd`.
 *
 * @see https://git-scm.com/docs/git-sparse-checkout
 */
export async function gitSparseCheckoutInit(
	options?: GitSparseCheckoutInitOptions,
): Promise<void> {
	const args = ["sparse-checkout", "init"];

	if (options?.cone) {
		args.push("--cone");
	}

	await execFileAsync("git", args, {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}

/**
 * Restricts the working tree at `options.execOptions.cwd` to `paths` (cone-mode
 * directory patterns when {@link gitSparseCheckoutInit} was called with `cone:
 * true`).
 *
 * @see https://git-scm.com/docs/git-sparse-checkout
 */
export async function gitSparseCheckoutSet(
	paths: readonly string[],
	options?: GitCommandOptions,
): Promise<void> {
	await execFileAsync("git", ["sparse-checkout", "set", ...paths], {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}
