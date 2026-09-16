import { dockerArg, execDocker } from "../_docker-command.js";
import type {
	DockerCommonOptions,
	DockerContainerId,
	DockerContainerName,
} from "../types.js";

export type DockerContainerStopOptions = DockerCommonOptions & {
	/** Seconds to wait before killing the container. */
	time?: number;
};

export async function dockerContainerStop(
	containers: (DockerContainerId | DockerContainerName)[],
	options?: DockerContainerStopOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.time !== undefined) {
		execArgs.push(`--time ${options.time}`);
	}

	for (const container of containers) {
		execArgs.push(dockerArg(container));
	}

	await execDocker("container stop", execArgs, options);
}
