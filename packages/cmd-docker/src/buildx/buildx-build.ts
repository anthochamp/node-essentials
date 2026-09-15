import type { Url } from "node:url";

import { escapeCommandArg, execAsync } from "@ac-kit/node";

export type DockerBuildxBuildOptions = {
	tags?: string[];
};

export async function dockerBuildxBuild(
	pathOrUrl: string | Url,
	options?: DockerBuildxBuildOptions,
): Promise<void> {
	const execArgs: string[] = [];

	for (const tag of options?.tags ?? []) {
		execArgs.push(`--tag ${escapeCommandArg(tag)}`);
	}

	// oxlint-disable-next-line typescript/no-base-to-string
	execArgs.push(escapeCommandArg(pathOrUrl.toString()));

	await execAsync(`docker buildx build ${execArgs.join(" ")}`);
}
