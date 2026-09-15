import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { spawnProcess } from "@ac-kit/node";

import {
	A_IMAGINARY_PHASE,
	A_REAL_PHASE,
	assertCloseTo,
	B_IMAGINARY_PHASE,
	B_REAL_PHASE,
	expectedProductChecksum,
	interleaved,
	LARGE,
} from "./__fixtures__/complex.js";
import { complexNativeGroup } from "./__fixtures__/native-group.js";

/**
 * Numpy as the outside reference for element-wise complex multiplication — the
 * thing a caller reaches for when they decide JavaScript is not fast enough.
 *
 * Separate from `complex-multiply.bench.ts` and far larger, for the reason
 * `math-stats` splits its own cross-language group out: a subprocess pays about
 * 50 ms to start Python and import numpy, so at the sizes the storage
 * comparison uses, the measurement is of process start-up and the
 * spawn-adjusted figure comes out negative. Here the array is repeated enough
 * times that compute is the majority of the run and `adjusted` means
 * something.
 *
 * Only the fastest JavaScript storage is carried across, because the point of
 * this table is the language boundary, not the layout — that is the other
 * file.
 */

const REPEAT = 100;

const nativeGroup = await complexNativeGroup();

durationCondition(
	`Complex multiply — ${LARGE.toLocaleString("en-US")} values × ${REPEAT}`,
	{
		sampling: {
			warmup: 2,
			minRuns: 5,
			maxRuns: 12,
			minTimeMs: 500,
			maxTimeMs: 8_000,
		},
		spawnBaselines: nativeGroup?.baselines,
	},
	() => {
		const wanted = expectedProductChecksum(LARGE);

		const a = interleaved(LARGE, A_REAL_PHASE, A_IMAGINARY_PHASE);
		const b = interleaved(LARGE, B_REAL_PHASE, B_IMAGINARY_PHASE);
		const out = new Float64Array(LARGE * 2);
		durationCase(
			"interleaved Float64Array (stride 2)",
			{ tags: { storage: "f64 interleaved", language: "TypeScript" } },
			() => {
				for (let pass = 0; pass < REPEAT; pass++) {
					for (let index = 0; index < LARGE; index++) {
						const at = index * 2;
						const ar = a[at]!;
						const ai = a[at + 1]!;
						const br = b[at]!;
						const bi = b[at + 1]!;
						out[at] = ar * br - ai * bi;
						out[at + 1] = ar * bi + ai * br;
					}
				}
				let real = 0;
				let imaginary = 0;
				for (let index = 0; index < LARGE; index++) {
					real += out[index * 2]!;
					imaginary += out[index * 2 + 1]!;
				}
				assert.strictEqual(real + 3 * imaginary, wanted);
			},
		);

		for (const program of nativeGroup?.programs ?? []) {
			durationCase(
				`${program.language} + numpy (complex128, vectorised)`,
				{
					tags: {
						storage: "numpy complex128",
						language: program.language,
						kind: "native",
					},
					subtractSpawnBaseline: true,
				},
				async () => {
					const { stdout } = await spawnProcess(program.command, [
						...program.baseArgs,
						"multiply",
						String(LARGE),
						String(REPEAT),
					]);
					assertCloseTo(Number.parseFloat(stdout), wanted, 15);
				},
			);
		}
	},
);
