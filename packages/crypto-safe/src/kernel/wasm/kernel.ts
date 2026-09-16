import { ConstantTimeKernel } from "../types.js";
import wasmBytes from "./_wasm-bytes.generated.js";

/**
 * Loads and installs the WASM constant-time kernel, embedded in this package at
 * build time (see `scripts/embed-wasm.mjs`) — no separate asset to locate or
 * ship. There is no JS fallback kernel (see `constant-time-kernel.ts`'s doc
 * comment for why), so importing this module — directly, or transitively via
 * the package's own barrel — installs it as a side effect. Not exported: a lib
 * user never calls this, they just get an installed kernel for free.
 */

declare const WebAssembly: {
	instantiate(bytes: Uint8Array): Promise<{ instance: { exports: unknown } }>;
};

/**
 * Exports of the compiled `fixed_uint.wasm` module.
 *
 * The module owns a seven-slot scratch area in its linear memory, in the order
 * A, B, EXP, MODULUS, R_SQUARED, MU, RESULT. Each slot is `fu_slot_words()` u64
 * words wide, which is enough for the widest supported modulus.
 */
type WasmExports_ = {
	readonly memory: { readonly buffer: ArrayBuffer };

	/** Byte offset of the scratch area; `>>> 3` gives the u64 word offset. */
	fu_scratch_ptr(): number;

	/** Width of one scratch slot, in u64 words. */
	fu_slot_words(): number;

	/** Returns the carry (`0` or `1`) out of the top limb. */
	fu_add(words: number): number;

	/** Returns the borrow (`0` or `1`) out of the top limb. */
	fu_sub(words: number): number;

	/** `-1` / `0` / `1`. */
	fu_cmp(words: number): number;

	fu_mont_mul(words: number, n0inv: bigint): void;
	fu_to_mont(words: number, n0inv: bigint): void;
	fu_from_mont(words: number, n0inv: bigint): void;
	fu_mod_exp(words: number, expBits: number, n0inv: bigint): void;
	fu_barrett_reduce(words: number): void;
};

const SLOT_A = 0;
const SLOT_B = 1;
const SLOT_EXP = 2;
const SLOT_MODULUS = 3;
const SLOT_R_SQUARED = 4;
const SLOT_MU = 5;
const SLOT_RESULT = 6;

let cachedKernel: ConstantTimeKernel | undefined;

/**
 * Adapts an instantiated `fixed_uint.wasm` module to a
 * {@link ConstantTimeKernel}.
 *
 * The caller instantiates the module — the mechanism and its timing are the
 * caller's business — and installs the result with `installConstantTimeKernel`.
 * Nothing here is asynchronous, so arithmetic never awaits once a kernel is
 * installed.
 *
 * @example
 * 	```ts
 *   const { instance } = await WebAssembly.instantiate(await readFile(path));
 *   installConstantTimeKernel(
 *     createWasmConstantTimeKernel(instance.exports as ConstantTimeWasmExports),
 *   );
 *   ```;
 *
 * @returns A kernel ready to install.
 */
export async function createWasmConstantTimeKernel(): Promise<ConstantTimeKernel> {
	if (cachedKernel) {
		return cachedKernel;
	}

	const bytes = Uint8Array.fromBase64(wasmBytes);
	const { instance } = await WebAssembly.instantiate(bytes);
	const wasmExports = instance.exports as unknown as WasmExports_;

	const slotWords = wasmExports.fu_slot_words();
	const scratchWordOffset = wasmExports.fu_scratch_ptr() >>> 3;

	// The buffer detaches whenever the module grows its memory, so the view
	// is rebuilt rather than cached.
	const words = (): BigUint64Array =>
		new BigUint64Array(wasmExports.memory.buffer);

	const slotOffset = (slot: number): number =>
		scratchWordOffset + slot * slotWords;

	const writeSlot = (
		slot: number,
		value: BigUint64Array,
		wordCount: number,
	): void => {
		const view = words();
		const base = slotOffset(slot);

		view.fill(0n, base, base + slotWords);
		view.set(value.subarray(0, wordCount), base);
	};

	const readSlot = (slot: number, wordCount: number): BigUint64Array => {
		const base = slotOffset(slot);

		return words().slice(base, base + wordCount);
	};

	cachedKernel = {
		maxWords: slotWords,

		add: (a, b, wordCount) => {
			writeSlot(SLOT_A, a, wordCount);
			writeSlot(SLOT_B, b, wordCount);

			const carry = wasmExports.fu_add(wordCount);

			return {
				result: readSlot(SLOT_RESULT, wordCount),
				carry: carry as 0 | 1,
			};
		},

		sub: (a, b, wordCount) => {
			writeSlot(SLOT_A, a, wordCount);
			writeSlot(SLOT_B, b, wordCount);

			const borrow = wasmExports.fu_sub(wordCount);

			return {
				result: readSlot(SLOT_RESULT, wordCount),
				borrow: borrow as 0 | 1,
			};
		},

		cmp: (a, b, wordCount) => {
			writeSlot(SLOT_A, a, wordCount);
			writeSlot(SLOT_B, b, wordCount);

			return wasmExports.fu_cmp(wordCount) as -1 | 0 | 1;
		},

		montgomeryMultiply: (a, b, modulus, n0inv, wordCount) => {
			writeSlot(SLOT_A, a, wordCount);
			writeSlot(SLOT_B, b, wordCount);
			writeSlot(SLOT_MODULUS, modulus, wordCount);
			wasmExports.fu_mont_mul(wordCount, n0inv);

			return readSlot(SLOT_RESULT, wordCount);
		},

		toMontgomery: (value, modulus, rSquared, n0inv, wordCount) => {
			writeSlot(SLOT_A, value, wordCount);
			writeSlot(SLOT_MODULUS, modulus, wordCount);
			writeSlot(SLOT_R_SQUARED, rSquared, wordCount);
			wasmExports.fu_to_mont(wordCount, n0inv);

			return readSlot(SLOT_RESULT, wordCount);
		},

		fromMontgomery: (value, modulus, n0inv, wordCount) => {
			writeSlot(SLOT_A, value, wordCount);
			writeSlot(SLOT_MODULUS, modulus, wordCount);
			wasmExports.fu_from_mont(wordCount, n0inv);

			return readSlot(SLOT_RESULT, wordCount);
		},

		modExp: (base, exponent, modulus, rSquared, n0inv, expBits, wordCount) => {
			writeSlot(SLOT_A, base, wordCount);
			writeSlot(SLOT_EXP, exponent, wordCount);
			writeSlot(SLOT_MODULUS, modulus, wordCount);
			writeSlot(SLOT_R_SQUARED, rSquared, wordCount);
			wasmExports.fu_mod_exp(wordCount, expBits, n0inv);

			return readSlot(SLOT_RESULT, wordCount);
		},

		barrettReduce: (value, modulus, mu, wordCount) => {
			writeSlot(SLOT_A, value, 2 * wordCount);
			writeSlot(SLOT_MODULUS, modulus, wordCount);
			writeSlot(SLOT_MU, mu, wordCount + 1);
			wasmExports.fu_barrett_reduce(wordCount);

			return readSlot(SLOT_RESULT, wordCount);
		},
	};

	return cachedKernel;
}
