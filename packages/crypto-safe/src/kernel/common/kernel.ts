/**
 * Fixed-width, constant-time modular arithmetic: a fixed-width, constant-time
 * unsigned integer representation for RSA- and EC-scale modular arithmetic.
 *
 * There is exactly one kernel, and it is WASM. Unlike {@link SoftFloatKernel},
 * where a portable JS kernel is the correct default and WASM is an optional
 * accelerator, the rule for secret-dependent arithmetic is direct: secret-
 * dependent code paths must be branch-free and index-independent, which is what
 * WASM is used for here. JavaScript gives no constant-time guarantee at all —
 * JIT tiering, GC pauses, and `BigInt` being variable-time by specification all
 * leak timing on secret-dependent paths — so a JS fallback here would not be a
 * slower version of the same property, it would be a different property that
 * happens to compute the same numbers.
 *
 * **Values are exchanged as `BigUint64Array` limbs, not `bigint`.** A secret
 * operand that passes through a JS `bigint` — even only to marshal it across
 * the WASM boundary — risks the same variable-time arithmetic this kernel
 * exists to avoid. `BigUint64Array` read/write is a fixed-size memory copy, not
 * an arithmetic operation on the value. Public, non-secret quantities (the
 * modulus, `R² mod m`, `μ`, `n0inv`) may be computed with ordinary `bigint`
 * arithmetic beforehand — {@link limb64FromBigInt} and {@link limb64ToBigInt}
 * exist for exactly that boundary — but nothing on the secret path should call
 * them. One gap remains that this cannot close on its own: unless a key is
 * loaded byte-for-byte into limbs, secret material arriving from ordinary
 * calling code will have been a `bigint` at least once, however briefly.
 *
 * Install a kernel once at application startup with
 * {@link installConstantTimeKernel}; every operation after that is synchronous.
 * Calling an operation before a kernel is installed throws rather than silently
 * falling back to something slower and unproven.
 */

import { ConstantTimeKernel } from "../types.js";

let activeKernel: ConstantTimeKernel | null = null;

/**
 * Installs the kernel every subsequent constant-time operation uses.
 *
 * @param kernel - The kernel to activate.
 * @returns The kernel that was previously active (`null` on the first call), so
 *   it can be restored.
 */
export function installConstantTimeKernel(
	kernel: ConstantTimeKernel,
): ConstantTimeKernel | null {
	const previous = activeKernel;

	activeKernel = kernel;

	return previous;
}

/**
 * The kernel currently handling constant-time arithmetic.
 *
 * @throws {Error} When no kernel has been installed yet.
 */
export function activeConstantTimeKernel(): ConstantTimeKernel {
	if (activeKernel === null) {
		throw new Error(
			"No constant-time kernel installed. Call installConstantTimeKernel(...) " +
				"during application startup before using constant-time arithmetic.",
		);
	}

	return activeKernel;
}
