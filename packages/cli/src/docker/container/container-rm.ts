import { escapePosixShSqe, execAsync } from "@ac-essentials/misc-util";
import type { DockerContainerId, DockerContainerName } from "../types.js";

interface DockerContainerRmOptions {
	force?: boolean;
	link?: boolean;
	volumes?: boolean;
}

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
		execArgs.push(`'${escapePosixShSqe(container)}'`);
	}

	await execAsync(`docker container rm ${execArgs.join(" ")}`);
}
