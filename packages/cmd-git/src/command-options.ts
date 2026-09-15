import type { ExecFileOptions } from "node:child_process";

// Every wrapper in this package calls `execFileAsync`, which spawns the `git`
// binary directly with an argv array — never a shell — so there is no shell
// metacharacter interpretation to guard against and `escapeCommandArg`
// (needed for `execAsync`'s shell-string form, e.g. `status-v1.ts`) does not
// apply here.

/** Common options accepted by every git-subcommand wrapper in this package. */
export type GitCommandOptions = {
	/** An optional AbortSignal that can be used to abort the operation. */
	signal?: AbortSignal | null;

	/**
	 * Additional options to pass to the underlying `execFileAsync` call,
	 * including `cwd` — the git repository to run the command in. Defaults to
	 * `execFileAsync`'s own default (`process.cwd()`) when omitted.
	 */
	execOptions?: Omit<ExecFileOptions, "signal" | "encoding">;
};
