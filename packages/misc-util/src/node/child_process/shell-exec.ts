import { type SpawnOptions, spawn } from "node:child_process";
import { EOL } from "node:os";
import * as readline from "node:readline";
import { PassThrough, type Stream } from "node:stream";
import type { Except, SetFieldType } from "type-fest";
import { defaults } from "../../ecma/object/defaults.js";
import { ProcessExitError } from "./process-exit-error.js";

export type ShellExecSpawnOptions = SetFieldType<
	Except<SpawnOptions, "stdio">,
	"shell",
	string
>;

export type ShellExecOptions = {
	// Options to pass to `child_process.spawn`.
	spawnOptions?: ShellExecSpawnOptions | null;

	/** If provided, both stdout and stderr will be piped to this stream. */
	outputStream?: Stream.Writable | null;

	/** If provided, this function will be called for each line of stderr output. */
	onStderrLine?: ((line: string) => void) | null;
};

const SHELL_EXEC_DEFAULT_OPTIONS: Required<ShellExecOptions> = {
	spawnOptions: null,
	outputStream: null,
	onStderrLine: null,
};

/**
 * Executes a command in a shell, returning a promise that resolves when the
 * command completes.
 *
 * The command is executed with `shell: true`, which means that shell features
 * such as redirection and piping are available. However, this also means that
 * arguments are not escaped, so be careful when using untrusted input.
 *
 * @param command The command to execute (with arguments)
 * @param options Options for executing the command
 * @returns A promise that resolves when the command completes successfully, or
 * rejects with a `ShellExecExitError` if the command fails.
 */
export async function shellExec(
	command: string,
	options?: ShellExecOptions,
): Promise<void> {
	const effectiveOptions = defaults(options, SHELL_EXEC_DEFAULT_OPTIONS);

	// Note: Using `spawn` with arguments and `shell: true` is deprecated:
	// 	[DEP0190] DeprecationWarning: Passing args to a child process with shell
	// 	option true can lead to security vulnerabilities, as the arguments are
	// 	not escaped, only concatenated.
	const handle = spawn(command, {
		shell: true,
		...effectiveOptions.spawnOptions,
		stdio: [
			"ignore",
			effectiveOptions.outputStream ? "pipe" : "ignore",
			effectiveOptions.outputStream || effectiveOptions.onStderrLine
				? "pipe"
				: "ignore",
		],
	});

	if (effectiveOptions.outputStream) {
		// biome-ignore lint/style/noNonNullAssertion: defined as stdio[1] is "pipe"
		handle.stdout!.pipe(effectiveOptions.outputStream);
		// biome-ignore lint/style/noNonNullAssertion: defined as stdio[2] is "pipe"
		handle.stderr!.pipe(effectiveOptions.outputStream);
	}

	if (effectiveOptions.onStderrLine) {
		let input: Stream.Readable;
		if (effectiveOptions.outputStream) {
			const passthrough = new PassThrough();
			// biome-ignore lint/style/noNonNullAssertion: defined as stdio[2] is "pipe"
			handle.stderr!.pipe(passthrough);

			input = passthrough;
		} else {
			// biome-ignore lint/style/noNonNullAssertion: defined as stdio[2] is "pipe"
			input = handle.stderr!;
		}

		readline
			.createInterface({
				input,
				crlfDelay: EOL === "\n" ? 0 : undefined,
			})
			.on("line", effectiveOptions.onStderrLine);
	}

	const deferred = Promise.withResolvers<void>();

	handle.on("exit", (code, signal) => {
		if (code !== 0) {
			deferred.reject(new ProcessExitError(code, signal, handle.killed));
		} else {
			deferred.resolve();
		}
	});

	return deferred.promise;
}
