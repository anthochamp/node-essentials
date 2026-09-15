import { IEEE_BINARY_FALLBACK_KERNEL } from "./fallback/fallback-kernel.js";
import { Ieee754Kernel } from "./types.js";

const FALLBACK_BATCH = IEEE_BINARY_FALLBACK_KERNEL.batch;

export let ieeeBinaryMul: Ieee754Kernel["mul"] =
	IEEE_BINARY_FALLBACK_KERNEL.mul;
export let ieeeBinaryDiv: Ieee754Kernel["div"] =
	IEEE_BINARY_FALLBACK_KERNEL.div;
export let ieeeBinaryAxpy: Ieee754Kernel["axpy"] =
	IEEE_BINARY_FALLBACK_KERNEL.axpy;
export let ieeeBinaryAxpby: Ieee754Kernel["axpby"] =
	IEEE_BINARY_FALLBACK_KERNEL.axpby;

export let ieeeBinaryMulBatch = FALLBACK_BATCH.mulBatch;
export let ieeeBinaryDivBatch = FALLBACK_BATCH.divBatch;
export let ieeeBinaryAxpyBatch = FALLBACK_BATCH.axpyBatch;
export let ieeeBinaryAxpbyBatch = FALLBACK_BATCH.axpbyBatch;

/**
 * Activates a kernel for `mul`/`div`/`axpy`/`axpby` and their batch variants.
 *
 * A kernel shipping no `batch` of its own keeps the portable one, which loops
 * the fallback's scalar ops; every kernel agrees bit for bit, so which one
 * evaluates a batch is a speed choice, not a correctness one.
 *
 * @param kernel - The kernel to activate.
 */
export function installIeeeBinaryKernel(kernel: Ieee754Kernel): void {
	ieeeBinaryMul = kernel.mul;
	ieeeBinaryDiv = kernel.div;
	ieeeBinaryAxpy = kernel.axpy;
	ieeeBinaryAxpby = kernel.axpby;

	ieeeBinaryMulBatch = kernel.batch?.mulBatch ?? FALLBACK_BATCH.mulBatch;
	ieeeBinaryDivBatch = kernel.batch?.divBatch ?? FALLBACK_BATCH.divBatch;
	ieeeBinaryAxpyBatch = kernel.batch?.axpyBatch ?? FALLBACK_BATCH.axpyBatch;
	ieeeBinaryAxpbyBatch = kernel.batch?.axpbyBatch ?? FALLBACK_BATCH.axpbyBatch;
}
