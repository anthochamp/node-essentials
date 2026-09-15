import { escapeCommandArg, execAsync } from "@ac-kit/node";

export async function dockerNetworkRm(networks: string[]): Promise<void> {
	const execArgs = networks.map((n) => escapeCommandArg(n));

	await execAsync(`docker network rm ${execArgs.join(" ")}`);
}
