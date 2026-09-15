import { escapeCommandArg, execAsync } from "@ac-kit/node";

export type DockerNetworkCreateOptions = {
	driver?: string;
};

export async function dockerNetworkCreate(
	network: string,
	options?: DockerNetworkCreateOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.driver && options.driver.length > 0) {
		execArgs.push(`--driver ${escapeCommandArg(options.driver)}`);
	}

	execArgs.push(escapeCommandArg(network));

	await execAsync(`docker network create ${execArgs.join(" ")}`);
}
