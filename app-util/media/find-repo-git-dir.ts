import { findUp, type Options } from "find-up";

export type FindRepoGitDirOptions = Omit<Options, "cwd" | "type">;

/**
 * Finds the .git directory by looking in the specified directory and its parents.
 *
 * @param fromDir The directory to start searching from.
 * @param options Options for finding the git directory.
 * @returns The path to the .git directory, or null if not found.
 */
export async function findRepoGitDir(
	fromDir: string,
	options?: FindRepoGitDirOptions,
): Promise<string | null> {
	const gitDir = await findUp(".git", {
		...options,
		cwd: fromDir,
		type: "directory",
	});

	return gitDir ?? null;
}
