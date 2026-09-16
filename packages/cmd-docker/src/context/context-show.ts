import { execDocker } from "../_docker-command.js";
import type { DockerCommonOptions } from "../types.js";

export type DockerContextShowOptions = DockerCommonOptions;

export async function dockerContextShow(
	options?: DockerContextShowOptions,
): Promise<string> {
	const { stdout } = await execDocker("context show", [], options);

	return stdout.trim();
}
