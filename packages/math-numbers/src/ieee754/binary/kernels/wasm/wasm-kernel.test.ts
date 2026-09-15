import { beforeAll, describe, expect, it } from "vitest";

import {
	IEEE_FORMAT_BINARY32,
	IEEE_FORMAT_BINARY64,
	IeeeFormat,
} from "../../../ieee-format.js";
import { ieeeBinaryFromNumber } from "../../ieee-binary-from-number.js";
import { ieeeBinaryToNumber } from "../../ieee-binary-to-number.js";
import { IEEE_BINARY_FALLBACK_KERNEL } from "../fallback/fallback-kernel.js";
import { Ieee754Kernel } from "../types.js";
import { createIeeeBinaryWasmKernel } from "./wasm-kernel.js";

/**
 * The WASM kernel is checked against the JS one, which the hardware oracle in
 * `_soft-float-arith.test.ts` has already pinned. Two kernels behind one
 * interface have to agree bit for bit or the interface is a lie.
 *
 * The kernel is embedded in the package (see `scripts/embed-wasm.mjs`), so no
 * availability check or Rust toolchain is needed to run this test.
 */

const OPERANDS: readonly number[] = [
	0,
	1,
	2,
	3,
	0.5,
	1.5,
	-1,
	-2,
	-0.5,
	7,
	10,
	0.1,
	1 / 3,
	2.5,
	1e-40,
	1e38,
];

describe("WASM soft-float kernel", () => {
	let kernel: Ieee754Kernel<Uint32Array>;

	beforeAll(async () => {
		kernel = await createIeeeBinaryWasmKernel();
	});

	describe.each([
		["binary32", IEEE_FORMAT_BINARY32],
		["binary64", IEEE_FORMAT_BINARY64],
	] as const)("%s", (_name, format: IeeeFormat) => {
		const agree = (operation: "mul" | "div", a: number, b: number): void => {
			const left = ieeeBinaryFromNumber(a, format);
			const right = ieeeBinaryFromNumber(b, format);
			const expected = IEEE_BINARY_FALLBACK_KERNEL[operation](
				left,
				right,
				format,
			);
			const actual = kernel[operation](left, right, format);

			expect(ieeeBinaryToNumber(actual, format), `${a} ${operation} ${b}`).toBe(
				ieeeBinaryToNumber(expected, format),
			);
		};

		it.each(["mul", "div"] as const)(
			"agrees with the fallback kernel for %s",
			(operation) => {
				for (const a of OPERANDS) {
					for (const b of OPERANDS) {
						if (operation === "div" && b === 0) {
							continue;
						}

						agree(operation, a, b);
					}
				}
			},
		);

		it("agrees with the fallback kernel for axpy", () => {
			for (const a of OPERANDS) {
				for (const x of OPERANDS) {
					for (const y of OPERANDS) {
						const pa = ieeeBinaryFromNumber(a, format);
						const px = ieeeBinaryFromNumber(x, format);
						const py = ieeeBinaryFromNumber(y, format);

						const expected = IEEE_BINARY_FALLBACK_KERNEL.axpy(
							pa,
							px,
							py,
							format,
						);
						const actual = kernel.axpy(pa, px, py, format);

						expect(
							ieeeBinaryToNumber(actual, format),
							`${a} \u00d7 ${x} + ${y}`,
						).toBe(ieeeBinaryToNumber(expected, format));
					}
				}
			}
		});
	});
});
