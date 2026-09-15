import { Ieee754Kernel } from "../types.js";
import { axpbyBatch } from "./_axpby-batch.js";
import { axpby } from "./_axpby.js";
import { axpyBatch } from "./_axpy-batch.js";
import { axpy } from "./_axpy.js";
import { divBatch } from "./_div-batch.js";
import { div } from "./_div.js";
import { mulBatch } from "./_mul-batch.js";
import { mul } from "./_mul.js";

/**
 * The portable kernel, installed by default.
 *
 * Its `batch` has no crossing to amortise — it is a plain loop over the scalar
 * ops — and exists so that a native kernel shipping no `batch` of its own still
 * has a correct one to fall back to.
 */
export const IEEE_BINARY_FALLBACK_KERNEL = {
	mul,
	div,
	axpy,
	axpby,
	batch: { mulBatch, divBatch, axpyBatch, axpbyBatch },
} as const satisfies Ieee754Kernel<bigint>;
