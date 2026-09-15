import { execFileAsync } from "@ac-kit/node";

import type { GitCommandOptions } from "./command-options.js";

/**
 * Adds a remote named `name` pointing at `url` (in `options.execOptions.cwd`).
 *
 * @see https://git-scm.com/docs/git-remote#Documentation/git-remote.txt-emaddem
 */
export async function gitRemoteAdd(
	name: string,
	url: string,
	options?: GitCommandOptions,
): Promise<void> {
	await execFileAsync("git", ["remote", "add", name, url], {
		...options?.execOptions,
		signal: options?.signal ?? undefined,
	});
}
