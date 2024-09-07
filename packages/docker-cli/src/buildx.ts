import { exec as exec_ } from "node:child_process";
import type { Url } from "node:url";
import { promisify } from "node:util";
import { escapeSQE } from "@ac-essentials/misc-util";

const exec = promisify(exec_);

export interface DockerBuildOptions {
	tags?: string[];
}

export async function dockerBuild(
	pathOrUrl: string | Url,
	options?: DockerBuildOptions,
) {
	const execArgs: string[] = [];

	for (const tag of options?.tags ?? []) {
		execArgs.push(`--tag '${escapeSQE(tag)}'`);
	}

	execArgs.push(`'${escapeSQE(pathOrUrl.toString())}'`);

	await exec(`docker build ${execArgs.join(" ")}`);
}
