import { platform } from "node:process";

import {
	escapeCommandArg,
	shellDialectForPlatform,
} from "@ac-kit/format-shell";
import { execAsync } from "@ac-kit/node";

import type { DockerCommonOptions } from "./types.js";

const SHELL_DIALECT_ = shellDialectForPlatform(platform);

/** Quote one value for the shell `execDocker` hands the command line to. */
export function dockerArg(value: string): string {
	return escapeCommandArg(value, SHELL_DIALECT_);
}

/**
 * Run a docker subcommand.
 *
 * The CLI only accepts its global flags before the subcommand, so this is the
 * one place that knows where they go.
 */
export async function execDocker(
	subcommand: string,
	args: readonly string[],
	options?: DockerCommonOptions,
): Promise<{ stdout: string; stderr: string }> {
	const words = ["docker"];

	if (options?.context !== undefined && options.context.length > 0) {
		words.push("--context", dockerArg(options.context));
	}

	words.push(subcommand, ...args);

	return execAsync(words.join(" "), { encoding: "utf8" });
}
