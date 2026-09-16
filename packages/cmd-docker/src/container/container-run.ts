import { EnvVariables, printEnvAssignment } from "@ac-kit/format-shell";

import { dockerArg, execDocker } from "../_docker-command.js";
import type { DockerCommonOptions, DockerContainerName } from "../types.js";

export type DockerContainerRunOptions = DockerCommonOptions & {
	command?: string;
	commandArgs?: string[];
	rm?: boolean;
	detach?: boolean;
	name?: DockerContainerName;
	network?: string;
	addHost?: string[]; // hostname:ip
	env?: EnvVariables;
	publish?: string[]; // ip:[hostPort]:containerPort | [hostPort:]containerPort
	volume?: string[]; // host-src:container-dest[:options]
};

export async function dockerContainerRun(
	image: string,
	options?: DockerContainerRunOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.rm) {
		execArgs.push("--rm");
	}
	if (options?.detach) {
		execArgs.push("--detach");
	}
	if (options?.name && options.name.length > 0) {
		execArgs.push(`--name ${dockerArg(options.name)}`);
	}
	if (options?.network && options.network.length > 0) {
		execArgs.push(`--network ${dockerArg(options.network)}`);
	}
	for (const addHost of options?.addHost ?? []) {
		execArgs.push(`--add-host ${dockerArg(addHost)}`);
	}
	for (const [name, value] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env ${dockerArg(printEnvAssignment(name, value))}`);
	}
	for (const publish of options?.publish ?? []) {
		execArgs.push(`--publish ${dockerArg(publish)}`);
	}
	for (const volume of options?.volume ?? []) {
		execArgs.push(`--volume ${dockerArg(volume)}`);
	}

	execArgs.push(dockerArg(image));

	if (options?.command) {
		execArgs.push(dockerArg(options.command));

		for (const commandArg of options?.commandArgs ?? []) {
			execArgs.push(dockerArg(commandArg));
		}
	}

	await execDocker("container run", execArgs, options);
}
