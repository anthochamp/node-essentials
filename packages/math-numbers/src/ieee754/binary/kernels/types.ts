import { IeeeFormat } from "../../ieee-format.js";
import { IeeeBinary } from "../ieee-binary-types.js";

declare const IeeeBinaryPackedTag_: unique symbol;
declare const IeeeBinaryPackedArrayTag_: unique symbol;

/**
 * One IEEE 754 binary value in its packed interchange encoding — exactly
 * `format.k / 8` bytes, sign/exponent/trailing-significand in the standard
 * field order.
 *
 * Packed form exists only for the batch entry points, which hand a whole buffer
 * to a native kernel in one crossing. Scalar arithmetic never packs.
 */
export type IeeeBinaryPacked = Uint8Array<ArrayBuffer> & {
	readonly [IeeeBinaryPackedTag_]: unique symbol;
};

/** `count` {@link IeeeBinaryPacked} values, contiguous, back to back. */
export type IeeeBinaryPackedArray = Uint8Array & {
	readonly [IeeeBinaryPackedArrayTag_]: unique symbol;
};

export type Ieee754BinaryFunction<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = (a: IeeeBinary, b: IeeeBinary, format: IeeeFormat) => IeeeBinary<TSig>;
export type Ieee754AxpyFunction<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = (
	a: IeeeBinary,
	x: IeeeBinary,
	y: IeeeBinary,
	format: IeeeFormat,
) => IeeeBinary<TSig>;
export type Ieee754AxpbyFunction<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = (
	a: IeeeBinary,
	x: IeeeBinary,
	b: IeeeBinary,
	y: IeeeBinary,
	format: IeeeFormat,
) => IeeeBinary<TSig>;

/**
 * The arithmetic behind `ieeeBinaryMul`/`Div`/`Axpy`/`Axpby`, as a swappable
 * implementation.
 *
 * Only operations expensive enough per element that a native kernel is expected
 * to win despite the crossing cost belong here. `add`/`sub`/`neg`/`abs`/`cmp`/
 * `sqrt` have exactly one implementation each (`ieee-binary-add.ts` and
 * siblings) and are never installed or swapped.
 *
 * A kernel is installed synchronously, so arithmetic never awaits — an `await`
 * in front of `a.mul(b)` would put an I/O shape on a pure computation.
 *
 * Operands are accepted in either significand representation (a value produced
 * by the other kernel is converted at the boundary, not rejected — see
 * `finiteToBigInt`/`finiteToLimbs`); `TSig` names only the representation
 * _this_ kernel produces, so results never carry an unnecessary conversion back
 * to a shared canonical form.
 */
export type Ieee754Kernel<
	TSig extends bigint | Uint32Array = bigint | Uint32Array,
> = {
	mul: Ieee754BinaryFunction<TSig>;
	div: Ieee754BinaryFunction<TSig>;
	axpy: Ieee754AxpyFunction<TSig>;
	axpby: Ieee754AxpbyFunction<TSig>;

	/**
	 * Batched entry points, one native crossing for `count` elements instead of
	 * one per element. Absent on a kernel with no crossing to amortise.
	 */
	readonly batch?: Ieee754BatchKernel;
};

export type Ieee754BatchBinaryFunction = (
	a: IeeeBinaryPackedArray,
	b: IeeeBinaryPackedArray,
	out: IeeeBinaryPackedArray,
	count: number,
	format: IeeeFormat,
) => void;
/** `a`/`b` are single scalar operands, broadcast over `count`. */
export type Ieee754BatchAxpyFunction = (
	a: IeeeBinaryPacked,
	x: IeeeBinaryPackedArray,
	y: IeeeBinaryPackedArray,
	out: IeeeBinaryPackedArray,
	count: number,
	format: IeeeFormat,
) => void;
export type Ieee754BatchAxpbyFunction = (
	a: IeeeBinaryPacked,
	x: IeeeBinaryPackedArray,
	b: IeeeBinaryPacked,
	y: IeeeBinaryPackedArray,
	out: IeeeBinaryPackedArray,
	count: number,
	format: IeeeFormat,
) => void;

export type Ieee754BatchKernel = {
	mulBatch: Ieee754BatchBinaryFunction;
	divBatch: Ieee754BatchBinaryFunction;
	axpyBatch: Ieee754BatchAxpyFunction;
	axpbyBatch: Ieee754BatchAxpbyFunction;
};
