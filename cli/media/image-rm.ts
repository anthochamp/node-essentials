import { escapePosixShSqe, execAsync } from "@ac-essentials/misc-util";

type DockerImageId = string;

interface DockerImageRmOptions {
	force?: boolean;
	noPrune?: boolean;
}

export async function dockerImageRm(
	images: DockerImageId[],
	options?: DockerImageRmOptions,
): Promise<void> {
	const execArgs: string[] = [];

	if (options?.force) {
		execArgs.push("--force");
	}
	if (options?.noPrune) {
		execArgs.push("--no-prune");
	}

	for (const image of images) {
		execArgs.push(`'${escapePosixShSqe(image)}'`);
	}

	await execAsync(`docker image rm ${execArgs.join(" ")}`);
}
