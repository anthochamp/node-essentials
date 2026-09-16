import { dockerArg, execDocker } from "../_docker-command.js";

export async function dockerContextUse(context: string): Promise<void> {
	await execDocker("context use", [dockerArg(context)]);
}
