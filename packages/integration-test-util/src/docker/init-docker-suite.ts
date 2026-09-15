import {
	dockerBuildxBuild,
	dockerContainerRm,
	dockerContextShow,
	dockerContextUse,
	dockerImageRm,
} from "@ac-kit/cmd-docker";
import { getRandomBytes } from "@ac-kit/crypto-random";
import { afterAll, afterEach, beforeAll } from "vitest";

export type InitDockerSuiteOptions = {
	/**
	 * Prefix for the container name.
	 *
	 * Defaults to "test-".
	 */
	containerNamePrefix?: string;

	/**
	 * Docker context to switch to for all suite operations.
	 *
	 * Defaults to "default".
	 */
	contextName?: string;
};

export type DockerSuiteContext = {
	containerName: string;
	containerImageName: string;
	stopContainer: () => Promise<void>;
};

/**
 * Registers beforeAll / afterAll / afterEach hooks that handle the full Docker
 * lifecycle for a container test suite: - saves and restores the active Docker
 * context - builds the image from srcPath before all tests - removes the image
 * after all tests - stops and removes the container after each test
 */
export function initDockerSuite(
	srcPath: string,
	options?: InitDockerSuiteOptions,
): DockerSuiteContext {
	const prefix = options?.containerNamePrefix ?? "test-";
	const contextName = options?.contextName ?? "default";
	const containerName = `${prefix}${Buffer.from(getRandomBytes(20)).toString("hex")}`;
	const containerImageName = `${containerName}-img`;
	let initialContext: string;

	async function stopContainer(): Promise<void> {
		try {
			await dockerContainerRm([containerName], { force: true });
		} catch {}
	}

	beforeAll(async () => {
		initialContext = await dockerContextShow();
		await dockerContextUse(contextName);
		await stopContainer();
		try {
			await dockerImageRm([containerImageName], { force: true });
		} catch {}
		await dockerBuildxBuild(srcPath, { tags: [containerImageName] });
	});

	afterAll(async () => {
		try {
			await dockerImageRm([containerImageName], { force: true });
		} catch {}
		try {
			await dockerContextUse(initialContext);
		} catch {}
	});

	afterEach(async () => {
		await stopContainer();
	});

	return { containerName, containerImageName, stopContainer };
}
