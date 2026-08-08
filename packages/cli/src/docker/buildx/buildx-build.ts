import type { Url } from "node:url";

import { escapePosixShSqe, execAsync } from "@ac-essentials/misc-util";

export type DockerBuildxBuildOptions = {
	tags?: string[];
};

export async function dockerBuildxBuild(
	pathOrUrl: string | Url,
	options?: DockerBuildxBuildOptions,
): Promise<void> {
	const execArgs: string[] = [];

	for (const tag of options?.tags ?? []) {
		execArgs.push(`--tag '${escapePosixShSqe(tag)}'`);
	}

	// oxlint-disable-next-line typescript/no-base-to-string
	execArgs.push(`'${escapePosixShSqe(pathOrUrl.toString())}'`);

	await execAsync(`docker buildx build ${execArgs.join(" ")}`);
}
