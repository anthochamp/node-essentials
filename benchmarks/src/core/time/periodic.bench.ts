/**
 * Repeating timer latency — idle and loaded loop.
 *
 * Drift is the key metric: a timer that recomputes each deadline from a fixed
 * origin cannot accumulate error no matter how late individual firings are.
 */
import { setInterval as intervalGenerator } from "node:timers/promises";

import { jitterCase, jitterCondition } from "@ac-bench/measure-jitter";
import { EventLoopLoad } from "@ac-bench/util";
import { PeriodicalTimer } from "@ac-kit/core";

type Repeater = (onTick: () => void) => () => void;

const REPEATS = 2;
const WARMUP = 1;
const PERIOD_MS = 10;
const TICKS = 150;

for (const load of [null, new EventLoopLoad()]) {
	const loop = load ? "loaded" : "idle";

	const fromRepeater = (
		name: string,
		kind: string,
		tags: Record<string, string>,
		repeater: Repeater,
	): void =>
		jitterCase(
			name,
			PERIOD_MS,
			{
				tags: { kind, ...tags, loop },
				setup: () => load?.start(),
				teardown: () => load?.stop(),
			},
			() =>
				new Promise<number[]>((resolve) => {
					const samples: number[] = [];
					const origin = performance.now();
					let count = 0;
					let done = false;
					let stop: (() => void) | null = null;

					stop = repeater(() => {
						if (done) return;
						count++;
						samples.push(performance.now() - (origin + count * PERIOD_MS));
						if (count >= TICKS) {
							done = true;
							stop?.();
							resolve(samples);
						}
					});
				}),
		);

	jitterCondition(
		`Repeating ${PERIOD_MS} ms — ${TICKS} ticks, ${loop} loop`,
		{ warmup: WARMUP, repeats: REPEATS },
		() => {
			fromRepeater(
				"self-correcting setTimeout chain",
				"native",
				{ schedules: "from origin" },
				(onTick) => {
					const origin = performance.now();
					let count = 0;
					let handle: NodeJS.Timeout | null = null;
					let cancelled = false;
					const armNext = () => {
						if (cancelled) return;
						count++;
						const remaining = origin + count * PERIOD_MS - performance.now();
						handle = setTimeout(
							() => {
								armNext();
								onTick();
							},
							Math.max(0, remaining),
						);
					};
					armNext();
					return () => {
						cancelled = true;
						if (handle) clearTimeout(handle);
					};
				},
			);
			fromRepeater(
				"setInterval",
				"native",
				{ schedules: "from previous firing" },
				(onTick) => {
					const handle = setInterval(onTick, PERIOD_MS);
					return () => clearInterval(handle);
				},
			);
			fromRepeater(
				"@ac-kit/.PeriodicalTimer",
				"js",
				{ schedules: "from previous firing" },
				(onTick) => {
					const timer = new PeriodicalTimer(onTick, PERIOD_MS);
					timer.start();
					return () => timer.stop();
				},
			);
			jitterCase(
				"timers/promises setInterval",
				PERIOD_MS,
				{
					tags: { kind: "native", schedules: "from previous firing", loop },
					setup: () => load?.start(),
					teardown: () => load?.stop(),
				},
				async () => {
					const samples: number[] = [];
					const origin = performance.now();
					let count = 0;
					for await (const _ of intervalGenerator(PERIOD_MS)) {
						count++;
						samples.push(performance.now() - (origin + count * PERIOD_MS));
						if (count >= TICKS) break;
					}
					return samples;
				},
			);
		},
	);
}
