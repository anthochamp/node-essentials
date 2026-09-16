import { dockerArg, execDocker } from "../_docker-command.js";
import type { DockerCommonOptions, DockerImageId } from "../types.js";

export type DockerImageRmOptions = DockerCommonOptions & {
	force?: boolean;
	noPrune?: boolean;
};

export async function dockerImageRm(
	images: DockerImageId[],
	options?: DockerImageRmOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.force) {
		execArgs.push("--force");
	}
	if (options?.noPrune) {
		execArgs.push("--no-prune");
	}

	for (const image of images) {
		execArgs.push(dockerArg(image));
	}

	await execDocker("image rm", execArgs, options);
}
