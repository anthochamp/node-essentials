import { describe, expect, it } from "vitest";

import {
	IEEE_FORMAT_BINARY16,
	IEEE_FORMAT_BINARY32,
	IEEE_FORMAT_BINARY64,
	IeeeFormat,
} from "../../../ieee-format.js";
import { ieeeBinaryFromNumber } from "../../ieee-binary-from-number.js";
import { ieeeBinaryToNumber } from "../../ieee-binary-to-number.js";
import { IeeeBinaryPacked, IeeeBinaryPackedArray } from "../types.js";
import { axpbyBatch } from "./_axpby-batch.js";
import { axpyBatch } from "./_axpy-batch.js";
import { elementBytes, readElement, writeElement } from "./_batch-element.js";
import { divBatch } from "./_div-batch.js";
import { mulBatch } from "./_mul-batch.js";
import { IEEE_BINARY_FALLBACK_KERNEL } from "./fallback-kernel.js";

/**
 * The batch entry points must return exactly what looping the scalar op returns
 * — a native kernel is allowed to be faster, never different.
 *
 * Binary16 is in the sweep on purpose: its two-byte elements are the case a
 * word-addressed buffer would get wrong, since every odd element starts at an
 * offset no `Uint32Array` view can cover.
 */

const FORMATS: readonly { name: string; format: IeeeFormat }[] = [
	{ name: "binary16", format: IEEE_FORMAT_BINARY16 },
	{ name: "binary32", format: IEEE_FORMAT_BINARY32 },
	{ name: "binary64", format: IEEE_FORMAT_BINARY64 },
];

const VALUES: readonly number[] = [
	1, 2, 3, 0.5, -1.5, 7, 10, 0.25, -0.125, 100, 2.5, -3.5, 0.75, 6,
];

function packAll(
	values: readonly number[],
	format: IeeeFormat,
): IeeeBinaryPackedArray {
	const bytes = new Uint8Array(
		values.length * elementBytes(format),
	) as IeeeBinaryPackedArray;

	values.forEach((value, index) => {
		writeElement(ieeeBinaryFromNumber(value, format), bytes, index, format);
	});

	return bytes;
}

function unpackAll(
	bytes: IeeeBinaryPackedArray,
	count: number,
	format: IeeeFormat,
): number[] {
	return Array.from({ length: count }, (_unused, index) =>
		ieeeBinaryToNumber(readElement(bytes, index, format), format),
	);
}

describe.each(FORMATS)("$name fallback batch", ({ format }) => {
	const count = VALUES.length;
	const left = packAll(VALUES, format);
	const right = packAll([...VALUES].reverse(), format);
	const out = new Uint8Array(
		count * elementBytes(format),
	) as IeeeBinaryPackedArray;

	it("mulBatch matches the scalar mul element for element", () => {
		mulBatch(left, right, out, count, format);

		expect(unpackAll(out, count, format)).toEqual(
			VALUES.map((value, index) =>
				ieeeBinaryToNumber(
					IEEE_BINARY_FALLBACK_KERNEL.mul(
						ieeeBinaryFromNumber(value, format),
						ieeeBinaryFromNumber([...VALUES].reverse()[index]!, format),
						format,
					),
					format,
				),
			),
		);
	});

	it("divBatch matches the scalar div element for element", () => {
		divBatch(left, right, out, count, format);

		expect(unpackAll(out, count, format)).toEqual(
			VALUES.map((value, index) =>
				ieeeBinaryToNumber(
					IEEE_BINARY_FALLBACK_KERNEL.div(
						ieeeBinaryFromNumber(value, format),
						ieeeBinaryFromNumber([...VALUES].reverse()[index]!, format),
						format,
					),
					format,
				),
			),
		);
	});

	it("axpyBatch broadcasts the scalar and matches the scalar axpy", () => {
		const scalar = packAll([3], format) as unknown as IeeeBinaryPacked;

		axpyBatch(scalar, left, right, out, count, format);

		expect(unpackAll(out, count, format)).toEqual(
			VALUES.map((value, index) =>
				ieeeBinaryToNumber(
					IEEE_BINARY_FALLBACK_KERNEL.axpy(
						ieeeBinaryFromNumber(3, format),
						ieeeBinaryFromNumber(value, format),
						ieeeBinaryFromNumber([...VALUES].reverse()[index]!, format),
						format,
					),
					format,
				),
			),
		);
	});

	it("axpbyBatch broadcasts both scalars and matches the scalar axpby", () => {
		const scalarA = packAll([3], format) as unknown as IeeeBinaryPacked;
		const scalarB = packAll([-2], format) as unknown as IeeeBinaryPacked;

		axpbyBatch(scalarA, left, scalarB, right, out, count, format);

		expect(unpackAll(out, count, format)).toEqual(
			VALUES.map((value, index) =>
				ieeeBinaryToNumber(
					IEEE_BINARY_FALLBACK_KERNEL.axpby(
						ieeeBinaryFromNumber(3, format),
						ieeeBinaryFromNumber(value, format),
						ieeeBinaryFromNumber(-2, format),
						ieeeBinaryFromNumber([...VALUES].reverse()[index]!, format),
						format,
					),
					format,
				),
			),
		);
	});
});
