import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import {
	BinaryFp,
	BinaryFp128,
	BinaryFp16,
	BinaryFp32,
	BinaryFp64,
	createIeeeBinaryWasmKernel,
	IEEE_BINARY_FALLBACK_KERNEL,
	IEEE_FORMAT_BINARY64,
	IeeeBinary,
	ieeeBinaryAdd,
	ieeeBinaryDiv,
	ieeeBinaryFromNumber,
	ieeeBinaryMul,
	installIeeeBinaryKernel,
} from "@ac-kit/math-numbers";
import { xorshift32 } from "@ac-kit/math-random";

/**
 * What software IEEE 754 costs against the FPU that does the same job.
 *
 * The hardware is not a contender to beat — it wins by construction. It is the
 * baseline that says how much the portable path costs, which is the number
 * needed to decide whether a compiled kernel is worth carrying at all.
 *
 * Only `mul` and `div` carry a kernel dimension: they are the two scalar
 * operations a kernel may replace (`Ieee754Kernel`), so each is measured under
 * both. `add` has one implementation and is measured once — running it twice
 * under two kernel labels would report the same function as two contenders.
 */

const FORMAT = IEEE_FORMAT_BINARY64;
const SIZE = 50000;

/** Deterministic operands spread over several binades. */
function operands(count: number): { left: Float64Array; right: Float64Array } {
	const left = new Float64Array(count);
	const right = new Float64Array(count);
	const rand = xorshift32(0x2545f491);

	const next = () => rand();

	for (let index = 0; index < count; index++) {
		const scale = 2 ** Math.trunc(next() * 20 - 10);

		left[index] = (next() * 2 - 1) * scale;
		right[index] = (next() * 2 - 1) * scale;
	}

	return { left, right };
}

const { left, right } = operands(SIZE);

const leftValue = Array.from(left, (value) =>
	ieeeBinaryFromNumber(value, FORMAT),
);
const rightValue = Array.from(right, (value) =>
	ieeeBinaryFromNumber(value, FORMAT),
);

const leftFp = Array.from(left, (value) => new BinaryFp(FORMAT, value));
const rightFp = Array.from(right, (value) => new BinaryFp(FORMAT, value));

const leftFp16 = Array.from(left, (value) => new BinaryFp16(value));
const rightFp16 = Array.from(right, (value) => new BinaryFp16(value));

const leftFp32 = Array.from(left, (value) => new BinaryFp32(value));
const rightFp32 = Array.from(right, (value) => new BinaryFp32(value));

const leftFp64 = Array.from(left, (value) => new BinaryFp64(value));
const rightFp64 = Array.from(right, (value) => new BinaryFp64(value));

const leftFp128 = Array.from(left, (value) => new BinaryFp128(value));
const rightFp128 = Array.from(right, (value) => new BinaryFp128(value));

/** Consumed so the loops cannot be optimised away. */
let sink = 0;

type OpName = "add" | "mul" | "div";

const HARDWARE_OP: Record<OpName, (a: number, b: number) => number> = {
	add: (a, b) => a + b,
	mul: (a, b) => a * b,
	div: (a, b) => a / b,
};

const DIRECT_NAME: Record<OpName, string> = {
	add: "ieeeBinaryAdd",
	mul: "ieeeBinaryMul",
	div: "ieeeBinaryDiv",
};

/** `mul`/`div` route through the installed kernel; `add` never does. */
const SWAPPABLE: Record<OpName, boolean> = {
	add: false,
	mul: true,
	div: true,
};

// Each wrapper reads the live `ieeeBinaryMul`/`ieeeBinaryDiv` bindings on every
// call — `installIeeeBinaryKernel` reassigns them, so capturing the function
// values here would freeze whichever kernel was installed first.
const DIRECT_OP: Record<
	OpName,
	(a: IeeeBinary, b: IeeeBinary, format: typeof FORMAT) => IeeeBinary
> = {
	add: (a, b, format) => ieeeBinaryAdd(a, b, format),
	mul: (a, b, format) => ieeeBinaryMul(a, b, format),
	div: (a, b, format) => ieeeBinaryDiv(a, b, format),
};

function directAll(op: OpName): IeeeBinary {
	const fn = DIRECT_OP[op];
	let last: IeeeBinary = leftValue[0]!;

	for (let index = 0; index < SIZE; index++) {
		last = fn(leftValue[index]!, rightValue[index]!, FORMAT);
	}

	return last;
}

interface FpRunner {
	readonly add: () => void;
	readonly mul: () => void;
	readonly div: () => void;
}

/**
 * One runner per public type, built once at module load.
 *
 * The three loops must not be shared across types. V8 gives each closure its
 * own feedback vector, so a runner built here only ever sees one receiver map
 * and its `add`/`mul`/`div` call sites stay monomorphic; a single generic loop
 * called with all five types would go megamorphic and the suite would measure
 * its own dispatch instead of the type under test. For the same reason the
 * method is named literally rather than looked up with a computed key.
 */
function fpRunner<T extends { add(o: T): T; mul(o: T): T; div(o: T): T }>(
	leftValues: readonly T[],
	rightValues: readonly T[],
	bitWidth: number,
): FpRunner {
	return {
		add: () => {
			let last = leftValues[0]!;

			for (let index = 0; index < SIZE; index++) {
				last = leftValues[index]!.add(rightValues[index]!);
			}

			sink += last === leftValues[0] ? bitWidth : 0;
		},
		mul: () => {
			let last = leftValues[0]!;

			for (let index = 0; index < SIZE; index++) {
				last = leftValues[index]!.mul(rightValues[index]!);
			}

			sink += last === leftValues[0] ? bitWidth : 0;
		},
		div: () => {
			let last = leftValues[0]!;

			for (let index = 0; index < SIZE; index++) {
				last = leftValues[index]!.div(rightValues[index]!);
			}

			sink += last === leftValues[0] ? bitWidth : 0;
		},
	};
}

const fpRunners = {
	software64: fpRunner(leftFp, rightFp, 64),
	fp16: fpRunner(leftFp16, rightFp16, 16),
	fp32: fpRunner(leftFp32, rightFp32, 32),
	fp64: fpRunner(leftFp64, rightFp64, 64),
	fp128: fpRunner(leftFp128, rightFp128, 128),
} as const;

const wasmKernel = await createIeeeBinaryWasmKernel();

function registerOpCondition(op: OpName, symbol: string): void {
	const hardware = HARDWARE_OP[op];
	const directName = DIRECT_NAME[op];
	const swappable = SWAPPABLE[op];

	durationCondition(
		`IEEE — binary64 ${op}, ${SIZE.toLocaleString("en-US")} pairs`,
		() => {
			durationCase(
				`hardware \`a ${symbol} b\``,
				{ tags: { kind: "native", layer: "fpu" } },
				() => {
					let total = 0;

					for (let index = 0; index < SIZE; index++) {
						total += hardware(left[index]!, right[index]!);
					}

					sink += total === 0 ? 1 : 0;
				},
			);

			durationCase(
				swappable ? `${directName} direct, fallback kernel` : directName,
				{
					tags: { kind: "js", layer: "kernel" },
					setup: () => installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
				},
				() => {
					sink += directAll(op).kind === "finite" ? 1 : 0;
				},
			);

			if (swappable) {
				durationCase(
					`${directName} direct, WASM kernel`,
					{
						tags: { kind: "native", layer: "kernel" },
						setup: () => installIeeeBinaryKernel(wasmKernel),
						teardown: () =>
							installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
					},
					() => {
						sink += directAll(op).kind === "finite" ? 1 : 0;
					},
				);
			}

			durationCase(
				"BinaryFp (binary64), fallback kernel",
				{
					tags: { kind: "js", layer: "public type", width: "64-software" },
					setup: () => installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
				},
				fpRunners.software64[op],
			);

			if (swappable) {
				durationCase(
					"BinaryFp (binary64), WASM kernel",
					{
						tags: {
							kind: "native",
							layer: "public type",
							width: "64-software",
						},
						setup: () => installIeeeBinaryKernel(wasmKernel),
						teardown: () =>
							installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
					},
					fpRunners.software64[op],
				);
			}

			durationCase(
				"BinaryFp16",
				{ tags: { kind: "js", layer: "public type", width: "16" } },
				fpRunners.fp16[op],
			);

			durationCase(
				"BinaryFp32",
				{ tags: { kind: "js", layer: "public type", width: "32" } },
				fpRunners.fp32[op],
			);

			durationCase(
				"BinaryFp64",
				{
					tags: { kind: "native", layer: "public type", width: "64-hardware" },
				},
				fpRunners.fp64[op],
			);

			durationCase(
				"BinaryFp128, fallback kernel",
				{
					tags: { kind: "js", layer: "public type", width: "128" },
					setup: () => installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
				},
				fpRunners.fp128[op],
			);

			if (swappable) {
				durationCase(
					"BinaryFp128, WASM kernel",
					{
						tags: { kind: "native", layer: "public type", width: "128" },
						setup: () => installIeeeBinaryKernel(wasmKernel),
						teardown: () =>
							installIeeeBinaryKernel(IEEE_BINARY_FALLBACK_KERNEL),
					},
					fpRunners.fp128[op],
				);
			}
		},
	);
}

registerOpCondition("add", "+");
registerOpCondition("mul", "×");
registerOpCondition("div", "÷");

export { sink };
