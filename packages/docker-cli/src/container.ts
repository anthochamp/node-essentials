import { exec as exec_ } from "node:child_process";
import { promisify } from "node:util";
import {
	type EnvVarName,
	type EnvVarValue,
	escapeSQE,
	stringifyEnvVar,
} from "@ac-essentials/misc-util";

const exec = promisify(exec_);

export type DockerContainerId = string;
export type DockerContainerName = string;

export interface DockerContainerRunOptions {
	detach?: boolean;
	env?: Record<EnvVarName, EnvVarValue>;
	name?: DockerContainerName;
	publish?: string[]; // ip:[hostPort]:containerPort | [hostPort:]containerPort
}

export async function dockerContainerRun(
	image: string,
	command?: string,
	commandArgs?: string[],
	options?: DockerContainerRunOptions,
) {
	const execArgs: string[] = [];

	if (options?.detach) {
		execArgs.push("--detach");
	}
	for (const [k, v] of Object.entries(options?.env ?? {})) {
		execArgs.push(`--env '${escapeSQE(stringifyEnvVar(k, v))}'`);
	}
	if (options?.name && options.name.length > 0) {
		execArgs.push(`--name '${escapeSQE(options.name)}'`);
	}
	for (const e of options?.publish ?? []) {
		execArgs.push(`--publish '${escapeSQE(e)}'`);
	}

	execArgs.push(`'${escapeSQE(image)}'`);

	if (command) {
		execArgs.push(`'${escapeSQE(command)}'`);

		for (const commandArg of commandArgs ?? []) {
			execArgs.push(`'${escapeSQE(commandArg)}'`);
		}
	}

	await exec(`docker container run ${execArgs.join(" ")}`);
}

interface DockerContainerRmOptions {
	force?: boolean;
	link?: boolean;
	volumes?: boolean;
}

export async function dockerContainerRm(
	containers: (DockerContainerId | DockerContainerName)[],
	options?: DockerContainerRmOptions,
) {
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
		execArgs.push(`'${escapeSQE(container)}'`);
	}

	await exec(`docker container rm ${execArgs.join(" ")}`);
}
