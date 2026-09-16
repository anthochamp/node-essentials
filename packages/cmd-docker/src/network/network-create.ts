import { dockerArg, execDocker } from "../_docker-command.js";
import type { DockerCommonOptions } from "../types.js";

export type DockerNetworkCreateOptions = DockerCommonOptions & {
	driver?: string;
};

export async function dockerNetworkCreate(
	network: string,
	options?: DockerNetworkCreateOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.driver && options.driver.length > 0) {
		execArgs.push(`--driver ${dockerArg(options.driver)}`);
	}

	execArgs.push(dockerArg(network));

	await execDocker("network create", execArgs, options);
}
