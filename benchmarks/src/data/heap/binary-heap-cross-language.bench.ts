import assert from "assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { checksum, DEFAULT_SEED, randomUint32Values } from "@ac-bench/util";
import { BinaryHeap } from "@ac-kit/data";
import { xorshift32 } from "@ac-kit/math-random";

import {
	getReferencePrograms,
	invokeAndAssertStdoutNumber,
} from "../__fixtures__/cross-language.js";

const CROSS_HEAP_SIZE = 200_000;

function heapStructureOf(language: string): string {
	switch (language) {
		case "Python":
			return "heapq";
		case "C++":
			return "std::priority_queue";
		default:
			return "BinaryHeap";
	}
}

const condition = await getReferencePrograms();

durationCondition(
	`Binary heap — ${CROSS_HEAP_SIZE.toLocaleString("en-US")} elements, one process per iteration`,
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
		const wanted = checksum(randomUint32Values(CROSS_HEAP_SIZE, DEFAULT_SEED));

		durationCase(
			"@ac-kit/.BinaryHeap",
			{
				tags: { kind: "js", language: "TypeScript" },
			},
			() => {
				const heap = new BinaryHeap<number>((a, b) => a <= b);
				const rand = xorshift32(DEFAULT_SEED);
				for (let index = 0; index < CROSS_HEAP_SIZE; index++) {
					heap.insert(Math.round(rand() * 0x1_0000_0000));
				}
				let sum = 0;
				for (
					let item = heap.extract();
					item !== undefined;
					item = heap.extract()
				) {
					sum = (sum + item) >>> 0;
				}
				assert.strictEqual(sum, wanted);
			},
		);

		for (const program of condition?.programs ?? []) {
			durationCase(
				`${program.language} ${heapStructureOf(program.language)}`,
				{
					tags: { kind: "native", language: program.language },
				},
				async () => {
					await invokeAndAssertStdoutNumber(
						program,
						"heap",
						CROSS_HEAP_SIZE,
						wanted,
					);
				},
			);
		}
	},
);
