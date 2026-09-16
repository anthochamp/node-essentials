import { dockerArg, execDocker } from "../_docker-command.js";
import type {
	DockerCommonOptions,
	DockerContainerId,
	DockerContainerName,
} from "../types.js";

export type DockerContainerRmOptions = DockerCommonOptions & {
	force?: boolean;
	link?: boolean;
	volumes?: boolean;
};

export async function dockerContainerRm(
	containers: (DockerContainerId | DockerContainerName)[],
	options?: DockerContainerRmOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.force) {
		execArgs.push("--force");
	}
	if (options?.link) {
		execArgs.push("--link");
	}
	if (options?.volumes) {
		execArgs.push("--volumes");
	}

	for (const container of containers) {
		execArgs.push(dockerArg(container));
	}

	await execDocker("container rm", execArgs, options);
}
