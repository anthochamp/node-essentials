import { wordsForBits } from "@ac-kit/core";

import { IeeeFormat } from "../../../ieee-format.js";
import { finiteToLimbs } from "../../_finite-to-limbs.js";
import { packFromLimbs } from "../../_pack-from-limbs.js";
import { unpackToLimbs } from "../../_unpack-to-limbs.js";
import { IeeeBinary } from "../../ieee-binary-types.js";
import { Ieee754Kernel } from "../types.js";
import wasmBytes from "./_wasm-bytes.generated.js";

/**
 * Instantiates the WASM soft-float kernel, embedded in this package at build
 * time (see `scripts/embed-wasm.mjs`) — no separate asset to locate or ship.
 *
 * Currently slower than the portable JS kernel for every scalar operation at
 * every format width: the fixed cost of crossing into WASM per call is not
 * recovered by a faster in-module operation. Install it for the batch path
 * (`mulBatch`/`divBatch`/`axpyBatch`/`axpbyBatch`), where one crossing is
 * amortised over many elements, not for scalar speed.
 */

declare const WebAssembly: {
	instantiate(bytes: Uint8Array): Promise<{ instance: { exports: unknown } }>;
};

let cachedKernel: Ieee754Kernel<Uint32Array> | undefined;

/**
 * Exports of the compiled `soft_float.wasm` module.
 *
 * Typed structurally rather than against the DOM `WebAssembly` namespace, so
 * the package keeps `lib: ["ESNext"]`.
 *
 * The module owns a three-slot scratch area in its linear memory: operands go
 * into slots A and B, the result comes out of slot R. Each slot is
 * `sf_slot_words()` u32 words wide, which is enough for the widest supported
 * format.
 */
type WasmExports_ = {
	readonly memory: { readonly buffer: ArrayBuffer };

	/** Byte offset of the scratch area; `>>> 2` gives the u32 word offset. */
	sf_scratch_ptr(): number;

	/** Width of one scratch slot, in u32 words. */
	sf_slot_words(): number;

	sf_add(k: number, p: number, emax: number): void;
	sf_mul(k: number, p: number, emax: number): void;
	sf_div(k: number, p: number, emax: number): void;
};

/**
 * Adapts an instantiated `soft_float.wasm` module to a {@link Ieee754Kernel}.
 *
 * The caller instantiates the module — the mechanism and its timing are the
 * caller's business — and installs the result with `installSoftFloatKernel`.
 * Nothing here is asynchronous, so arithmetic never awaits.
 *
 * The WASM engine works on packed IEEE 754 bit patterns using native `i32` and
 * `i64` operations, which is where its advantage over the `bigint`-based JS
 * kernel comes from. Operands already carrying this kernel's own limb-encoded
 * significand (see `sig-convert.ts`) cost nothing extra at this boundary;
 * anything else (a plain `bigint`-backed value) is converted once here, so the
 * accelerator pays for its own representation rather than the default path
 * paying for one it does not use.
 *
 * @example
 * 	```ts
 * 	const { instance } = await WebAssembly.instantiate(await readFile(path));
 * 	installSoftFloatKernel(
 * 		createWasmSoftFloatKernel(instance.exports as SoftFloatWasmExports),
 * 	);
 * 	```;
 *
 * @param exports - Exports of the instantiated module.
 * @returns A kernel ready to install.
 */
export async function createIeeeBinaryWasmKernel(): Promise<
	Ieee754Kernel<Uint32Array>
> {
	if (cachedKernel) {
		return cachedKernel;
	}

	const bytes = Uint8Array.fromBase64(wasmBytes);
	const { instance } = await WebAssembly.instantiate(bytes);

	const wasmExports = instance.exports as unknown as WasmExports_;

	const slotWords = wasmExports.sf_slot_words();
	const scratchWordOffset = wasmExports.sf_scratch_ptr() >>> 2;

	// The buffer detaches whenever the module grows its memory (it never does
	// today, since the scratch area is fixed-size, but the check is what makes
	// caching safe rather than assumed), so the view is rebuilt only then.
	let cachedView: Uint32Array = new Uint32Array(wasmExports.memory.buffer);
	const words = (): Uint32Array => {
		if (cachedView.buffer !== wasmExports.memory.buffer) {
			cachedView = new Uint32Array(wasmExports.memory.buffer);
		}
		return cachedView;
	};

	const writeSlot = (
		slot: 0 | 1,
		value: IeeeBinary,
		format: IeeeFormat,
	): void => {
		const native =
			value.kind === "finite"
				? finiteToLimbs(value, wordsForBits(format.p, 32))
				: value;
		const packed = packFromLimbs(native, format);
		const view = words();
		const base = scratchWordOffset + slot * slotWords;

		view.fill(0, base, base + slotWords);
		view.set(packed, base);
	};

	const readResult = (format: IeeeFormat): IeeeBinary<Uint32Array> => {
		const base = scratchWordOffset + 2 * slotWords;
		const wordCount = wordsForBits(format.k, 32);

		// `subarray` is a view, not a copy — safe because `sfUnpackLimbs`
		// consumes it synchronously, before the scratch area can be overwritten.
		return unpackToLimbs(words().subarray(base, base + wordCount), format);
	};

	const binary =
		(
			op: (k: number, p: number, emax: number) => void,
		): ((
			a: IeeeBinary,
			b: IeeeBinary,
			format: IeeeFormat,
		) => IeeeBinary<Uint32Array>) =>
		(a, b, format) => {
			writeSlot(0, a, format);
			writeSlot(1, b, format);
			op(format.k, format.p, format.emax);

			return readResult(format);
		};

	// `add_` exists only to compose `axpy`/`axpby` below — `add` itself is not
	// part of `Ieee754Kernel` (see kernels/types.ts), so it is never exported.
	const add_ = binary(wasmExports.sf_add.bind(wasmExports));
	const mul_ = binary(wasmExports.sf_mul.bind(wasmExports));

	cachedKernel = {
		mul: mul_,
		div: binary(wasmExports.sf_div.bind(wasmExports)),

		// Composed from this kernel's own add/mul — two crossings and two
		// roundings, not yet a single fused `sf_axpy` export. Batch is left
		// unset (falls back to a scalar loop) until the compiled module grows a
		// native batched entry point.
		axpy: (a, x, y, format) => add_(mul_(a, x, format), y, format),
		axpby: (a, x, b, y, format) =>
			add_(mul_(a, x, format), mul_(b, y, format), format),
	};

	return cachedKernel;
}
