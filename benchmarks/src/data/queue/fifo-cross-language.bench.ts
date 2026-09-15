import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { sequentialChecksum } from "@ac-bench/util";

import {
	getReferencePrograms,
	invokeAndAssertStdoutNumber,
} from "../__fixtures__/cross-language.js";
import {
	jsCustomQueueWorkload,
	jsQueueWorkload,
} from "./__fixtures__/workload.js";

const SIZE = 5_000_000;

function queueStructureOf(language: string): string {
	switch (language) {
		case "Python":
			return "collections.deque";
		case "C++":
			return "std::deque";
		default:
			return "VecDeque";
	}
}

const condition = await getReferencePrograms();

durationCondition(
	`FIFO queue (cross language) — enqueue ${SIZE}, draining as it fills`,
	{
		spawnBaselines: condition?.baselines,
		sampling: {
			warmup: 3,
			minRuns: 10,
			maxRuns: 50,
			minTimeMs: 3_000,
			maxTimeMs: 20_000,
		},
	},
	() => {
		const wanted = sequentialChecksum(SIZE);

		durationCase(
			"@ac-kit/data.Queue",
			{
				tags: { kind: "js", language: "TypeScript" },
			},
			() => {
				assert.strictEqual(jsQueueWorkload(SIZE), wanted);
			},
		);

		durationCase(
			"Array + read cursor",
			{
				tags: { kind: "js", language: "JavaScript" },
			},
			() => {
				assert.strictEqual(jsCustomQueueWorkload(SIZE), wanted);
			},
		);

		for (const program of condition?.programs ?? []) {
			durationCase(
				`${program.language} ${queueStructureOf(program.language)}`,
				{
					tags: { kind: "native", language: program.language },
				},
				async () => {
					await invokeAndAssertStdoutNumber(program, "queue", SIZE, wanted);
				},
			);
		}
	},
);
