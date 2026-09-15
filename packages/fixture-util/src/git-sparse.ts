import { rm } from "node:fs/promises";
import { join } from "node:path";

import {
	gitCheckout,
	gitFetch,
	gitInit,
	gitRemoteAdd,
	gitRevParse,
	gitSparseCheckoutInit,
	gitSparseCheckoutSet,
} from "@ac-kit/cmd-git";

import type { FixtureEntryBase } from "./setup.js";

/** A fixture acquired as a sparse checkout of one pinned git commit. */
export interface GitSparseFixtureEntry extends FixtureEntryBase {
	/** Git remote URL. */
	readonly url: string;

	/** Full, pinned commit SHA — never a branch or tag that can move. */
	readonly commit: string;

	/** Cone-mode sparse-checkout paths, relative to the repository root. */
	readonly sparsePaths: readonly string[];
}

/**
 * Fetches one git-hosted corpus by cloning nothing but the pinned commit's
 * object graph (`--filter=blob:none`) and checking out only the sparse paths
 * that are actually needed, instead of the whole repository.
 *
 * The checked-out `.git` metadata is only needed to produce the worktree above,
 * not to consume the fixture, so it is removed once the checkout is verified.
 *
 * @throws {Error} When the checked-out `HEAD` does not match
 *   {@link GitSparseFixtureEntry.commit} — defense in depth on top of git's own
 *   content-addressed verification of the fetched objects.
 */
export async function setupGitSparseFixtureEntry(
	entry: GitSparseFixtureEntry,
	destination: string,
): Promise<void> {
	const execOptions = { cwd: destination };

	await gitInit({ execOptions });
	await gitRemoteAdd("origin", entry.url, { execOptions });
	await gitFetch("origin", entry.commit, {
		filter: "blob:none",
		depth: 1,
		execOptions,
	});
	await gitSparseCheckoutInit({ cone: true, execOptions });
	await gitSparseCheckoutSet(entry.sparsePaths, { execOptions });
	await gitCheckout(entry.commit, { execOptions });

	const checkedOutCommit = await gitRevParse("HEAD", { execOptions });

	if (checkedOutCommit !== entry.commit) {
		throw new Error(
			`fixture "${entry.id}": checked out ${checkedOutCommit}, expected pinned commit ${entry.commit}`,
		);
	}

	await rm(join(destination, ".git"), { recursive: true, force: true });
}
