import { fileURLToPath } from "node:url";

import { prepareNativeToolchains } from "@ac-bench/util";
import { spawnProcess } from "@ac-kit/node";

/**
 * Builds the group, or returns `null` when there is no numpy to compare with.
 *
 * @returns The group title, its cases (with `language` tags for spawn
 *   attribution), and the spawn baselines, or `null` to skip.
 */
export async function crossLanguageMeanGroup() {
	const programs = await prepareNativeToolchains(
		[
			{
				language: "Python",
				sourcePath: fileURLToPath(
					new URL("./native/workload.py", import.meta.url),
				),
				candidates: ["python3"],
			},
		],
		{
			verify: async (candidate) => {
				try {
					await spawnProcess(candidate.command, [
						...candidate.baseArgs,
						"noop",
						"0",
						"0",
					]);
					return true;
				} catch {
					return false;
				}
			},
		},
	);

	if (programs.length === 0) {
		return null;
	}

	return {
		programs,
		baselines: programs.map((program) => ({
			name: program.language,
			command: program.command,
			args: [...program.baseArgs, "noop", "0"],
		})),
	};
}
