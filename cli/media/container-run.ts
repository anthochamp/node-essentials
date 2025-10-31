import {
	escapePosixShSqe,
	execAsync,
	stringifyEnvVariable,
} from "@ac-essentials/misc-util";
import type { DockerContainerName } from "../types.js";

export interface DockerContainerRunOptions {
	detach?: boolean;
	env?: Record<string, string | number | bigint | boolean | null>;
	name?: DockerContainerName;
	publish?: string[]; // ip:[hostPort]:containerPort | [hostPort:]containerPort
}

export async function dockerContainerRun(
	image: string,
	command?: string,
	commandArgs?: string[],
	options?: DockerContainerRunOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.detach) {
		execArgs.push("--detach");
	}
	for (const [k, v] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env '${escapePosixShSqe(stringifyEnvVariable(k, v))}'`);
	}
	if (options?.name && options.name.length > 0) {
		execArgs.push(`--name '${escapePosixShSqe(options.name)}'`);
	}
	for (const e of options?.publish ?? []) {
		execArgs.push(`--publish '${escapePosixShSqe(e)}'`);
	}

	execArgs.push(`'${escapePosixShSqe(image)}'`);

	if (command) {
		execArgs.push(`'${escapePosixShSqe(command)}'`);

		for (const commandArg of commandArgs ?? []) {
			execArgs.push(`'${escapePosixShSqe(commandArg)}'`);
		}
	}

	await execAsync(`docker container run ${execArgs.join(" ")}`);
}
