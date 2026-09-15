import { escapeCommandArg, execAsync } from "@ac-kit/node";

export async function dockerContextUse(context: string): Promise<void> {
	await execAsync(`docker context use ${escapeCommandArg(context)}`);
}
