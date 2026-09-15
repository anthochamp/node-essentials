/**
 * One-shot timer latency across three delays and two loop states.
 *
 * Each combination is a separate condition so the idle and loaded numbers are
 * never averaged together.
 */
import { setTimeout as delayPromise } from "node:timers/promises";

import { jitterCase, jitterCondition } from "@ac-bench/measure-jitter";
import { EventLoopLoad } from "@ac-bench/util";
import { Timer, sleep } from "@ac-kit/core";

/**
 * Firings per collection, chosen so each collection takes roughly equal wall
 * time.
 */
function firingsFor(delayMs: number): number {
	return Math.max(30, Math.round(600 / Math.max(delayMs, 1)));
}

const REPEATS = 3;
const WARMUP = 1;
const ONE_SHOT_DELAYS = [1, 5, 20];

for (const delayMs of ONE_SHOT_DELAYS) {
	for (const load of [null, new EventLoopLoad()]) {
		const firings = firingsFor(delayMs);
		const loop = load ? "loaded" : "idle";

		const once = (
			name: string,
			kind: string,
			fire: () => Promise<void>,
		): void =>
			jitterCase(
				name,
				delayMs,
				{
					tags: { kind, loop },
					setup: () => load?.start(),
					teardown: () => load?.stop(),
				},
				async () => {
					const samples: number[] = [];
					for (let index = 0; index < firings; index++) {
						const began = performance.now();
						await fire();
						samples.push(performance.now() - began - delayMs);
					}
					return samples;
				},
			);

		jitterCondition(
			`One-shot ${delayMs} ms — ${firings} sequential delays, ${loop} loop`,
			{ warmup: WARMUP, repeats: REPEATS },
			() => {
				once(
					"setTimeout",
					"native",
					() => new Promise<void>((resolve) => setTimeout(resolve, delayMs)),
				);
				once("timers/promises setTimeout", "native", () =>
					delayPromise(delayMs),
				);
				once("@ac-kit/.sleep", "js", () => sleep(delayMs));
				once(
					"@ac-kit/.Timer",
					"js",
					() =>
						new Promise<void>((resolve) => new Timer(resolve, delayMs).start()),
				);
			},
		);
	}
}
