import { stringifyEnvVariable } from "@ac-kit/core";
import { escapeCommandArg, execAsync } from "@ac-kit/node";

import type { DockerContainerId, DockerContainerName } from "../types.js";

export type DockerContainerExecOptions = {
	env?: Record<string, string | number | bigint | boolean | null>;
	user?: string;
	workdir?: string;
};

export async function dockerContainerExec(
	container: DockerContainerId | DockerContainerName,
	command: string,
	commandArgs?: string[],
	options?: DockerContainerExecOptions,
): Promise<{ stdout: string; stderr: string }> {
	const execArgs: string[] = [];

	for (const [k, v] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env ${escapeCommandArg(stringifyEnvVariable(k, v))}`);
	}
	if (options?.user && options.user.length > 0) {
		execArgs.push(`--user ${escapeCommandArg(options.user)}`);
	}
	if (options?.workdir && options.workdir.length > 0) {
		execArgs.push(`--workdir ${escapeCommandArg(options.workdir)}`);
	}

	execArgs.push(escapeCommandArg(container));
	execArgs.push(escapeCommandArg(command));

	for (const commandArg of commandArgs ?? []) {
		execArgs.push(escapeCommandArg(commandArg));
	}

	const { stdout, stderr } = await execAsync(
		`docker container exec ${execArgs.join(" ")}`,
		{ encoding: "utf8" },
	);

	return { stdout, stderr };
}
