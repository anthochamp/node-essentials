import type { ExecOptions } from "node:child_process";
import { EOL } from "node:os";
import {
	escapePosixShCommandArg,
	execAsync,
	joinNonEmpty,
} from "@ac-essentials/misc-util";

// XY two-letter status code
export type GitStatusCode = [string, string];

export type GitStatusV1Entry = {
	statusCode: GitStatusCode;

	/**
	 * Path relative to the git root.
	 */
	path: string;

	/**
	 * Original path in case of rename/copied contents, null otherwise.
	 */
	origPath: string | null;
};

export type GitStatusOptions = {
	/**
	 * Include ignored files.
	 */
	ignored?: boolean;

	/**
	 * An optional AbortSignal that can be used to abort the operation.
	 */
	signal?: AbortSignal | null;

	/**
	 * Additional options to pass to the `execAsync` function.
	 */
	execOptions?: Omit<ExecOptions, "signal" | "encoding">;
};

/**
 * Retrieves the git status in porcelain v1 format, optionally limited to the specified path(s).
 *
 * @documentation https://git-scm.com/docs/git-status#_porcelain_format_version_1
 * @param pathSpec Array of paths to limit the status to.
 * @param options Options for the git status command.
 * @returns Array of git status entries.
 */
export async function gitStatusV1Sync(
	pathSpec: string[] = [],
	options?: GitStatusOptions,
): Promise<GitStatusV1Entry[]> {
	const pathArgs = pathSpec.map((p) => escapePosixShCommandArg(p));
	const args = [
		...pathArgs,
		pathArgs.length > 0 ? "--" : "",
		"--porcelain=v1",
		options?.ignored ? "--ignored" : "",
	];

	const { stdout } = await execAsync(`git status ${joinNonEmpty(args, " ")}`, {
		...options?.execOptions,
		encoding: "utf8",
		signal: options?.signal ?? undefined,
	});

	return stdout
		.trimEnd()
		.split(EOL)
		.map((line) => {
			// either "XY PATH" or "XY ORIG_PATH -> PATH"
			const words = line.split(" ");

			return {
				statusCode: [words[0][0], words[0][1]],
				path: words.length === 2 ? words[1] : words[3],
				origPath: words.length === 2 ? null : words[1],
			};
		});
}
