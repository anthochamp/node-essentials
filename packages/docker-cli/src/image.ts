import { exec as exec_ } from "node:child_process";
import { promisify } from "node:util";
import {
	type EnvVarName,
	type EnvVarValue,
	escapeSQE,
} from "@ac-essentials/misc-util";

const exec = promisify(exec_);

type DockerImageId = string;

interface DockerImageRmOptions {
	force?: boolean;
	noPrune?: boolean;
}

export async function dockerImageRm(
	images: DockerImageId[],
	options?: DockerImageRmOptions,
) {
	const execArgs: string[] = [];

	if (options?.force) {
		execArgs.push("--force");
	}
	if (options?.noPrune) {
		execArgs.push("--no-prune");
	}

	for (const image of images) {
		execArgs.push(`'${escapeSQE(image)}'`);
	}

	await exec(`docker image rm ${execArgs.join(" ")}`);
}
