import type { CallableNoArgs } from "./callable.js";

/** A source of random numbers in `[0, 1)`, the same contract as `Math.random`. */
export type RandomFn = CallableNoArgs<number>;
