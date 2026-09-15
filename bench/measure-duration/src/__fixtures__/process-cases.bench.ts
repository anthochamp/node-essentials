import { durationCommandCase, durationCondition } from "../index.js";

durationCondition(
	"process cases",
	{
		sampling: {
			warmup: 1,
			minRuns: 3,
			maxRuns: 3,
			minTimeMs: 0,
			maxTimeMs: 30_000,
			relativeError: "off",
		},
	},
	() => {
		durationCommandCase("does nothing", process.execPath, ["-e", ""], {
			baselineArgs: ["-e", ""],
		});

		durationCommandCase("no baseline declared", process.execPath, ["-e", ""]);

		durationCommandCase("fails loudly", process.execPath, [
			"-e",
			'process.stderr.write("could not open the thing\\n"); process.exit(4);',
		]);
	},
);
