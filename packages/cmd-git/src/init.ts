import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

/**
 * Initializes a new, empty git repository (in `options.execOptions.cwd`, or the
 * process's own working directory when omitted).
 *
 * @see https://git-scm.com/docs/git-init
 */
export async function gitInit(options?: GitCommandOptions): Promise<void> {
	await execFileAsync("git", ["init", "--quiet"], {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}
