import { EnvVariables, printEnvAssignment } from "@ac-kit/format-shell";

import { dockerArg, execDocker } from "../_docker-command.js";
import type {
	DockerCommonOptions,
	DockerContainerId,
	DockerContainerName,
} from "../types.js";

export type DockerContainerExecOptions = DockerCommonOptions & {
	commandArgs?: string[];
	env?: EnvVariables;
	user?: string;
	workdir?: string;
};

export async function dockerContainerExec(
	container: DockerContainerId | DockerContainerName,
	command: string,
	options?: DockerContainerExecOptions,
): Promise<{ stdout: string; stderr: string }> {
	const execArgs: string[] = [];

	for (const [name, value] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env ${dockerArg(printEnvAssignment(name, value))}`);
	}
	if (options?.user && options.user.length > 0) {
		execArgs.push(`--user ${dockerArg(options.user)}`);
	}
	if (options?.workdir && options.workdir.length > 0) {
		execArgs.push(`--workdir ${dockerArg(options.workdir)}`);
	}

	execArgs.push(dockerArg(container));
	execArgs.push(dockerArg(command));

	for (const commandArg of options?.commandArgs ?? []) {
		execArgs.push(dockerArg(commandArg));
	}

	return execDocker("container exec", execArgs, options);
}
