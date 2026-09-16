/**
 * A value that can be printed into an environment variable assignment.
 *
 * Parsing never produces one of these: an environment variable value is always
 * a string, and reading `"42"` as a number is the caller's decision. See
 * `parseEnvValueAsNumber` and `parseEnvValueAsBool`.
 */
export type EnvValue = string | number | bigint | boolean | null;

/** Environment variables, keyed by name, ready to be printed. */
export type EnvVariables = Record<string, EnvValue>;

/** A single parsed assignment. */
export type EnvAssignment = {
	readonly name: string;
	readonly value: string;
};

/** How a boolean is spelled in an environment variable value. */
export type EnvBoolFlavor = "1/0" | "true/false" | "yes/no" | "on/off";

/**
 * The surface syntax an assignment is written in.
 *
 * - `assignment` — the bare `NAME=value` of one `execve` environment entry, as
 *   `env(1)` and `docker --env` take it. The value is literal: it already
 *   occupies a whole argument, so quoting it would make the quotes part of it.
 * - `dotenv` — a `.env` file line: `#` comments, blank lines, and values quoted
 *   only when they need it.
 * - `posix-export` — a POSIX shell `export NAME='value'` statement, safe to
 *   `source`.
 * - `win32-set` — a cmd.exe `set "NAME=value"` statement, safe in a batch file.
 */
export type EnvSyntax = "assignment" | "dotenv" | "posix-export" | "win32-set";
