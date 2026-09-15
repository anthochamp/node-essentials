import { shuffle } from "@ac-kit/algo";
import { MaybeAsyncCallableNoArgs, RandomFn } from "@ac-kit/core";

/** Two classes of raw, per-execution timing samples, in nanoseconds. */
export interface InterleavedTimings {
	classA: number[];
	classB: number[];
}

/** Options for {@link collectInterleavedTimings}. */
export type CollectOptions = {
	/** Executions of each closure to measure. Default `5000`. */
	samples?: number;

	/** Unmeasured executions of each closure before timing starts. Default `200`. */
	warmup?: number;

	/**
	 * High-resolution clock, in nanoseconds. A real run passes `hrtime.bigint`; a
	 * test injects a scripted clock instead of timing the host it runs on.
	 */
	now: () => bigint;

	/**
	 * Source of randomness for the shuffle that decides execution order. Fixed by
	 * the caller's choice of seed, so a run that finds no leak is reproducible
	 * rather than "passed this time".
	 */
	random: RandomFn;

	signal?: AbortSignal | null;

	beforeMeasure?: MaybeAsyncCallableNoArgs;
	afterMeasure?: MaybeAsyncCallableNoArgs;
};

/**
 * Times `classA` and `classB` in a randomly interleaved order and returns the
 * raw per-execution durations for each, in nanoseconds.
 *
 * Randomising the order — rather than running all of `classA` and then all of
 * `classB` — is the difference between this and an ordinary benchmark run: a
 * systematic drift over the run (CPU frequency scaling, thermal throttling,
 * background load) would otherwise land almost entirely on whichever class ran
 * second, and get mistaken for the class itself being slower.
 *
 * Both closures must be synchronous. An `await` inside the timed region would
 * add microtask-queue scheduling jitter on the order of microseconds, which
 * swamps the nanosecond-to-low-microsecond differences this is built to
 * detect.
 *
 * @param classA First closure to time.
 * @param classB Second closure to time.
 * @param options Sampling policy, clock and randomness.
 * @returns The two classes' raw timings, in the order they were collected
 *   within each class (not the randomised execution order).
 */
export async function collectInterleavedTimings(
	classA: () => void,
	classB: () => void,
	options: CollectOptions,
): Promise<InterleavedTimings> {
	options.signal?.throwIfAborted();

	const samples = options.samples ?? 5000;
	const warmup = options.warmup ?? 200;

	for (let index = 0; index < warmup; index++) {
		options.signal?.throwIfAborted();

		await options.beforeMeasure?.();
		classA();
		classB();
		await options.afterMeasure?.();
	}

	// A flat, shuffled sequence of labels decides execution order up front,
	// rather than shuffling per pair — a per-pair coin flip still lets both
	// classes fall into short local runs that a slow drift can bias.
	const order: (0 | 1)[] = Array.from({ length: 2 * samples });
	for (let index = 0; index < samples; index++) {
		order[2 * index] = 0;
		order[2 * index + 1] = 1;
	}

	const shuffledOrder = shuffle(order, { rand: options.random });

	const classATimings: number[] = [];
	const classBTimings: number[] = [];

	for (const label of shuffledOrder) {
		options.signal?.throwIfAborted();

		await options.beforeMeasure?.();
		if (label === 0) {
			const started = options.now();
			classA();
			classATimings.push(Number(options.now() - started));
		} else {
			const started = options.now();
			classB();
			classBTimings.push(Number(options.now() - started));
		}
		await options.afterMeasure?.();
	}

	return { classA: classATimings, classB: classBTimings };
}
