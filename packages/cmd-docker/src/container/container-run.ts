import { stringifyEnvVariable } from "@ac-kit/core";
import { escapeCommandArg, execAsync } from "@ac-kit/node";

import type { DockerContainerName } from "../types.js";

export type DockerContainerRunOptions = {
	rm?: boolean;
	detach?: boolean;
	name?: DockerContainerName;
	network?: string;
	addHost?: string[]; // hostname:ip
	env?: Record<string, string | number | bigint | boolean | null>;
	publish?: string[]; // ip:[hostPort]:containerPort | [hostPort:]containerPort
	volume?: string[]; // host-src:container-dest[:options]
};

export async function dockerContainerRun(
	image: string,
	command?: string,
	commandArgs?: string[],
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
		execArgs.push(`--name ${escapeCommandArg(options.name)}`);
	}
	if (options?.network && options.network.length > 0) {
		execArgs.push(`--network ${escapeCommandArg(options.network)}`);
	}
	for (const h of options?.addHost ?? []) {
		execArgs.push(`--add-host ${escapeCommandArg(h)}`);
	}
	for (const [k, v] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env ${escapeCommandArg(stringifyEnvVariable(k, v))}`);
	}
	for (const e of options?.publish ?? []) {
		execArgs.push(`--publish ${escapeCommandArg(e)}`);
	}
	for (const v of options?.volume ?? []) {
		execArgs.push(`--volume ${escapeCommandArg(v)}`);
	}

	execArgs.push(escapeCommandArg(image));

	if (command) {
		execArgs.push(escapeCommandArg(command));

		for (const commandArg of commandArgs ?? []) {
			execArgs.push(escapeCommandArg(commandArg));
		}
	}

	await execAsync(`docker container run ${execArgs.join(" ")}`);
}
