export type DockerContainerId = string;
export type DockerContainerName = string;
export type DockerImageId = string;

/** Options every docker command accepts, whatever its subcommand. */
export type DockerCommonOptions = {
	/**
	 * The docker context to run against, as `docker --context` takes it.
	 *
	 * Naming the context per command leaves the daemon the rest of the machine
	 * talks to alone, which `docker context use` would not.
	 */
	context?: string;
};
