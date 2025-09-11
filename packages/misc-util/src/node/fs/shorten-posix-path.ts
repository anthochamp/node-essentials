import { relative as relativePath } from "node:path";

/**
 * Returns the path relative to the current working directory or to the home directory,
 * whichever is shorter. If the path is the current working directory, returns ".".
 *
 * @param path The path to make relative.
 * @returns The relative path.
 */
export function shortenPosixPath(path: string): string {
	const fromCwd = relativePath(process.cwd(), path);

	let fromHome: string | undefined;

	if (process.env.HOME) {
		const relativeFromHome = relativePath(process.env.HOME, path);
		fromHome = `~${relativeFromHome ? `/${relativeFromHome}` : ""}`;
	}

	return (
		(fromHome && fromHome.length < fromCwd.length ? fromHome : fromCwd) || "."
	);
}
