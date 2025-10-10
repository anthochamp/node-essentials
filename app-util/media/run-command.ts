import { type FileHandle, open } from "node:fs/promises";
import * as path from "node:path";
import {
	defaults,
	ProcessExitError,
	type ShellExecOptions,
	shellExec,
	shortenPosixPath,
	stringifyEnvVariable,
} from "@ac-essentials/misc-util";

export type RunCommandOptions = {
	// Options for the underlying shell execution.
	shellExecOptions?: ShellExecOptions | null;

	// Directory where to store the run log file. If not provided, no run log file is created.
	runLogDir?: string | null;

	// Console where to log the command execution details. If not provided, no logging is done.
	console?: Console | null;
};

const RUN_COMMAND_DEFAULT_OPTIONS: Required<RunCommandOptions> = {
	shellExecOptions: null,
	runLogDir: null,
	console: null,
};

export async function runCommand(
	command: string,
	options?: RunCommandOptions,
): Promise<void> {
	const effectiveOptions = defaults(options, RUN_COMMAND_DEFAULT_OPTIONS);

	const debugEnvVars = Object.entries(
		effectiveOptions.shellExecOptions?.spawnOptions?.env ?? {},
	)
		.reduce<string[]>((env, [k, v]) => {
			if (v !== undefined) {
				env.push(stringifyEnvVariable(k, v));
			}
			return env;
		}, [])
		.join(" ");

	const debugCwd: string = (
		effectiveOptions.shellExecOptions?.spawnOptions?.cwd ?? process.cwd()
	).toString();

	const arg0 = command.split(" ")[0] ?? "";

	effectiveOptions.console?.group(
		`${shortenPosixPath(debugCwd)}>`,
		debugEnvVars,
		command,
	);

	let runLogFilePath: string | undefined;
	let runLogFd: FileHandle | undefined;
	if (effectiveOptions.runLogDir) {
		runLogFilePath = path.join(
			effectiveOptions.runLogDir,
			`${path.basename(arg0)}.txt`,
		);
		runLogFd = await open(runLogFilePath, "a");
	}

	await runLogFd?.write(`
${"=".repeat(140)}
At ${new Date().toString()}
Running ${command}
Options: ${JSON.stringify(effectiveOptions, null, 4)}
${"=".repeat(140)}

`);

	try {
		await shellExec(command, {
			...effectiveOptions.shellExecOptions,
			onStderrLine: (line) => effectiveOptions.console?.error(line),
			outputStream: runLogFd?.createWriteStream(),
		});
	} catch (error) {
		if (error instanceof ProcessExitError) {
			effectiveOptions.console?.error("Command failed with error:", error);
			effectiveOptions.console?.error(
				// biome-ignore lint/style/noNonNullAssertion: defined if runLogDir is defined
				`Run log available at ${shortenPosixPath(runLogFilePath!)}`,
			);
			return;
		}

		throw error;
	} finally {
		runLogFd?.close();
		effectiveOptions.console?.groupEnd();
	}
}
