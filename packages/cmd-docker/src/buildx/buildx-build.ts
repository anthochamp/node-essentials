import type { Url } from "node:url";

import { dockerArg, execDocker } from "../_docker-command.js";
import type { DockerCommonOptions } from "../types.js";

export type DockerBuildxBuildOptions = DockerCommonOptions & {
	tags?: string[];
};

export async function dockerBuildxBuild(
	pathOrUrl: string | Url,
	options?: DockerBuildxBuildOptions,
): Promise<void> {
	const execArgs: string[] = [];

	for (const tag of options?.tags ?? []) {
		execArgs.push(`--tag ${dockerArg(tag)}`);
	}

	// oxlint-disable-next-line typescript/no-base-to-string
	execArgs.push(dockerArg(pathOrUrl.toString()));

	await execDocker("buildx build", execArgs, options);
}
