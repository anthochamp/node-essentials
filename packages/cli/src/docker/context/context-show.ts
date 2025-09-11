import { execAsync } from "@ac-essentials/misc-util";

export async function dockerContextShow(): Promise<string> {
	const { stdout } = await execAsync("docker context show", {
		encoding: "utf8",
	});

	return stdout;
}
