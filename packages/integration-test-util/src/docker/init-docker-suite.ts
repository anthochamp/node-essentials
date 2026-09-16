import {
	dockerBuildxBuild,
	type DockerContainerName,
	dockerContainerRm,
	dockerContainerRun,
	type DockerContainerRunOptions,
	dockerImageRm,
} from "@ac-kit/cmd-docker";
import { getRandomBytes } from "@ac-kit/crypto-random";
import type { Except } from "type-fest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

export type InitDockerSuiteOptions = {
	/** Called with the name a container is about to be started under. */
	onContainerStarting?: (name: DockerContainerName) => void | Promise<void>;

	/** Called after a container is started. */
	onContainerStarted?: (name: DockerContainerName) => void | Promise<void>;

	/** Called before a container is removed, while it is still reachable. */
	onContainerStopping?: (name: DockerContainerName) => void | Promise<void>;

	/** Called after a container is removed. */
	onContainerStopped?: (name: DockerContainerName) => void | Promise<void>;

	/**
	 * Options to use when starting a container.
	 *
	 * The suite owns the name, the context and the detach flag: it has to know
	 * the name to remove the container, it runs every command against one
	 * context, and a container started in the foreground would never hand control
	 * back to the test.
	 */
	containerRunOptions?: (
		name: DockerContainerName,
	) => Except<DockerContainerRunOptions, "name" | "context" | "detach">;

	/**
	 * Prefix for the image and container names.
	 *
	 * Defaults to "test-".
	 */
	containerNamePrefix?: string;

	/** Docker context to run every command of this suite against. */
	context?: string;

	/** Whether to reuse the same container instance across tests. */
	reuseContainerInstance?: boolean;
};

export type DockerSuiteContext = {
	containerImageName: string;
};

function randomId(byteLength: number): string {
	return Buffer.from(getRandomBytes(byteLength)).toString("hex");
}

/**
 * Initializes a Docker test suite: builds the image at `srcPath` once, runs a
 * container per test, and removes both afterwards.
 *
 * Every name it generates carries a random per-suite id, so two suites running
 * concurrently — including two runs of the same file — never share an image tag
 * or a container name, and neither one's cleanup can remove the other's.
 *
 * @param srcPath The build context to build the suite's image from.
 * @param options Options for the suite.
 * @returns The names the suite generated, for tests that need to address them.
 */
export function initDockerSuite(
	srcPath: string,
	options?: InitDockerSuiteOptions,
): DockerSuiteContext {
	const containerNamePrefix = options?.containerNamePrefix ?? "test-";
	const suiteId = randomId(8);
	const containerImageName = `${containerNamePrefix}${suiteId}-img`;
	const commonOptions = { context: options?.context };

	const startedContainerNames: string[] = [];
	let imageBuildAttempted = false;

	async function stopContainer(
		containerName: DockerContainerName,
	): Promise<void> {
		const index = startedContainerNames.indexOf(containerName);
		if (index === -1) {
			return;
		}

		// Untracked before the removal, so a removal that fails is reported once
		// rather than retried until the drain loop gives up.
		startedContainerNames.splice(index, 1);

		await options?.onContainerStopping?.(containerName);
		await dockerContainerRm([containerName], {
			...commonOptions,
			force: true,
		});
		await options?.onContainerStopped?.(containerName);
	}

	async function stopAllContainers(): Promise<void> {
		while (startedContainerNames.length > 0) {
			await stopContainer(startedContainerNames[0]!);
		}
	}

	async function removeImage(): Promise<void> {
		if (!imageBuildAttempted) {
			return;
		}

		await dockerImageRm([containerImageName], {
			...commonOptions,
			force: true,
		});
	}

	beforeAll(async () => {
		// Set before the build, not after: a build that tags the image and then
		// fails still leaves one to remove.
		imageBuildAttempted = true;

		await dockerBuildxBuild(srcPath, {
			...commonOptions,
			tags: [containerImageName],
		});
	});

	afterAll(async () => {
		// Every step runs even when an earlier one throws, or a container that
		// refuses to die would strand the image for the rest of the machine.
		const failures: unknown[] = [];

		for (const step of [stopAllContainers, removeImage]) {
			try {
				await step();
			} catch (error) {
				failures.push(error);
			}
		}

		if (failures.length === 1) {
			throw failures[0];
		}
		if (failures.length > 1) {
			throw new AggregateError(failures, "Docker suite cleanup failed");
		}
	});

	beforeEach(async () => {
		if (options?.reuseContainerInstance && startedContainerNames.length > 0) {
			return;
		}

		const containerName = `${containerNamePrefix}${suiteId}-${randomId(4)}`;

		await options?.onContainerStarting?.(containerName);

		await dockerContainerRun(containerImageName, {
			...options?.containerRunOptions?.(containerName),
			...commonOptions,
			name: containerName,
			detach: true,
		});

		// Tracked before the "started" hook so a hook that throws still leaves a
		// container the teardown knows about.
		startedContainerNames.push(containerName);

		await options?.onContainerStarted?.(containerName);
	});

	afterEach(async () => {
		if (options?.reuseContainerInstance) {
			return;
		}

		await stopAllContainers();
	});

	return {
		containerImageName,
	};
}
