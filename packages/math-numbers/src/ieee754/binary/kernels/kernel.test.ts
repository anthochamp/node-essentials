import { afterEach, describe, expect, it } from "vitest";

import { BinaryFp } from "../../../num/binary-fp.js";
import { IEEE_FORMAT_BINARY128 } from "../../ieee-format.js";
import { IEEE_BINARY_FALLBACK_KERNEL } from "./fallback/fallback-kernel.js";
import { ieeeBinaryMul, installIeeeBinaryKernel } from "./kernel.js";
import { Ieee754Kernel } from "./types.js";

afterEach(() => {
	installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL);
});

describe("soft-float kernel", () => {
	it("defaults to the portable kernel", () => {
		expect(ieeeBinaryMul).toBe(IEEE_BINARY_FALLBACK_KERNEL.mul);
	});

	it("installs synchronously", () => {
		const counting: Ieee754Kernel = {
			...IEEE_BINARY_FALLBACK_KERNEL,
		};

		installIeeeBinaryKernel(counting);
		expect(ieeeBinaryMul).toBe(counting.mul);
	});

	it("routes BinaryFp arithmetic through the installed kernel", () => {
		const calls: string[] = [];
		const tracing: Ieee754Kernel = {
			...IEEE_BINARY_FALLBACK_KERNEL,
			mul: (a, b, format) => {
				calls.push("mul");

				return IEEE_BINARY_FALLBACK_KERNEL.mul(a, b, format);
			},
			div: (a, b, format) => {
				calls.push("div");

				return IEEE_BINARY_FALLBACK_KERNEL.div(a, b, format);
			},
		};

		installIeeeBinaryKernel(tracing);

		const two = new BinaryFp(IEEE_FORMAT_BINARY128, 2);
		const three = new BinaryFp(IEEE_FORMAT_BINARY128, 3);

		two.mul(three);
		two.div(three);

		expect(calls).toEqual(["mul", "div"]);
	});

	it("produces the same results before and after a swap", () => {
		const two = new BinaryFp(IEEE_FORMAT_BINARY128, 2);
		const seven = new BinaryFp(IEEE_FORMAT_BINARY128, 7);
		const before = seven.div(two).valueOf();

		installIeeeBinaryKernel({ ...IEEE_BINARY_FALLBACK_KERNEL });

		expect(seven.div(two).valueOf()).toBe(before);
	});
});
