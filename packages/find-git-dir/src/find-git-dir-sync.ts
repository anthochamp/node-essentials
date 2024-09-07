import { findUpSync } from "find-up";

export function findGitDirSync(): string {
	const rootDir = findUpSync(".git", {
		cwd: __dirname,
		type: "directory",
	});
	if (!rootDir) {
		throw new Error("Unable to find project root dir");
	}

	return rootDir;
}
