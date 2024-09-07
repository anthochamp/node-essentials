import { exec as exec_ } from "node:child_process";
import { promisify } from "node:util";
import { escapeSQE } from "@ac-essentials/misc-util";

const exec = promisify(exec_);

export async function dockerContextShow(): Promise<string> {
	const { stdout } = await exec("docker context show");

	return stdout;
}

export async function dockerContextUse(context: string) {
	await exec(`docker context use '${escapeSQE(context)}'`);
}
