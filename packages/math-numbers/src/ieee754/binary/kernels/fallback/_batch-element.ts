import { getUint32ArrayLe, setUint32ArrayLe } from "@ac-kit/core";

import { IeeeFormat } from "../../../ieee-format.js";
import { packFromBigInt } from "../../_pack-from-big-int.js";
import { unpackToBigInt } from "../../_unpack-to-big-int.js";
import { IeeeBinary } from "../../ieee-binary-types.js";

/**
 * Bytes one packed value occupies. Every IEEE 754 interchange format has `k` a
 * multiple of eight, so this is exact — but not always a multiple of four,
 * which is why the codec below is byte-addressed rather than word-addressed.
 */
export function elementBytes(format: IeeeFormat): number {
	return format.k >>> 3;
}

/** The `index`-th value of a packed buffer. */
export function readElement(
	bytes: Uint8Array,
	index: number,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const width = elementBytes(format);

	return unpackToBigInt(getUint32ArrayLe(bytes, index * width, width), format);
}

/** Writes `value` as the `index`-th value of a packed buffer, in place. */
export function writeElement(
	value: IeeeBinary<bigint>,
	bytes: Uint8Array,
	index: number,
	format: IeeeFormat,
): void {
	const width = elementBytes(format);

	setUint32ArrayLe(bytes, index * width, packFromBigInt(value, format), width);
}
