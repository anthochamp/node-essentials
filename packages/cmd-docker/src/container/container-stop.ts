import { escapeCommandArg, execAsync } from "@ac-kit/node";

import type { DockerContainerId, DockerContainerName } from "../types.js";

export type DockerContainerStopOptions = {
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
		execArgs.push(escapeCommandArg(container));
	}

	await execAsync(`docker container stop ${execArgs.join(" ")}`);
}
