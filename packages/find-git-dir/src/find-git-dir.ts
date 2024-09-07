import { findUp } from "find-up";

export async function findGitDir(): Promise<string> {
	const rootDir = await findUp(".git", { cwd: __dirname, type: "directory" });
	if (!rootDir) {
		throw new Error("Unable to find project root dir");
	}

	return rootDir;
}
