import { escapePosixShSqe, execAsync } from "@ac-essentials/misc-util";

export async function dockerContextUse(context: string): Promise<void> {
	await execAsync(`docker context use '${escapePosixShSqe(context)}'`);
}
