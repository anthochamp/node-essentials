import { dockerArg, execDocker } from "../_docker-command.js";
import type { DockerCommonOptions } from "../types.js";

export type DockerNetworkRmOptions = DockerCommonOptions;

export async function dockerNetworkRm(
	networks: string[],
	options?: DockerNetworkRmOptions,
): Promise<void> {
	await execDocker("network rm", networks.map(dockerArg), options);
}
