import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";

/**
 * One operation — the dot product of N 3-component vectors against a constant —
 * read from every layout `math-linear` and `math-color` could store it in.
 */

const SMALL = 1_000;
const LARGE = 200_000;

const WEIGHT_X = 2;
const WEIGHT_Y = 3;
const WEIGHT_Z = 4;

/**
 * Quarters, for two reasons. They are dyadic, so `Float32Array` holds them
 * exactly and every layout must produce the identical sum — a layout that is
 * fast because it lost precision fails the assertion instead of winning the
 * table. And they are not integers, so the plain `number[]` holds doubles
 * rather than V8's faster integer-tagged elements, which would otherwise
 * flatter it against the float arrays it is being compared with.
 */
function component_(index: number): number {
	return ((index * 37) % 256) / 4;
}

function expected_(count: number): number {
	let total = 0;
	for (let index = 0; index < count; index++) {
		total +=
			component_(index * 3) * WEIGHT_X +
			component_(index * 3 + 1) * WEIGHT_Y +
			component_(index * 3 + 2) * WEIGHT_Z;
	}

	return total;
}

type Vec3Tuple = [number, number, number];
type Vec3Object = { x: number; y: number; z: number };
type Planes = readonly [Float64Array, Float64Array, Float64Array];

function tupleArray_(count: number): Vec3Tuple[] {
	const items: Vec3Tuple[] = Array.from({ length: count });
	for (let index = 0; index < count; index++) {
		items[index] = [
			component_(index * 3),
			component_(index * 3 + 1),
			component_(index * 3 + 2),
		];
	}

	return items;
}

function objectArray_(count: number): Vec3Object[] {
	const items: Vec3Object[] = Array.from({ length: count });
	for (let index = 0; index < count; index++) {
		items[index] = {
			x: component_(index * 3),
			y: component_(index * 3 + 1),
			z: component_(index * 3 + 2),
		};
	}

	return items;
}

function flatArray_(count: number): number[] {
	const values: number[] = Array.from({ length: count * 3 });
	for (let index = 0; index < count * 3; index++) {
		values[index] = component_(index);
	}

	return values;
}

function packed_<T extends Float32Array | Float64Array>(
	values: T,
	count: number,
): T {
	for (let index = 0; index < count * 3; index++) {
		values[index] = component_(index);
	}

	return values;
}

function planes_(count: number): Planes {
	const x = new Float64Array(count);
	const y = new Float64Array(count);
	const z = new Float64Array(count);

	for (let index = 0; index < count; index++) {
		x[index] = component_(index * 3);
		y[index] = component_(index * 3 + 1);
		z[index] = component_(index * 3 + 2);
	}

	return [x, y, z];
}

function dotTuples_(items: readonly Vec3Tuple[]): number {
	let total = 0;
	for (let index = 0; index < items.length; index++) {
		const item = items[index]!;
		total += item[0] * WEIGHT_X + item[1] * WEIGHT_Y + item[2] * WEIGHT_Z;
	}

	return total;
}

function dotObjects_(items: readonly Vec3Object[]): number {
	let total = 0;
	for (let index = 0; index < items.length; index++) {
		const item = items[index]!;
		total += item.x * WEIGHT_X + item.y * WEIGHT_Y + item.z * WEIGHT_Z;
	}

	return total;
}

// One reader per layout, never a shared one taking a union: a single call site
// seeing three receiver types goes polymorphic, and would measure V8's dispatch
// rather than the layout under test.

function dotFlat_(values: readonly number[]): number {
	let total = 0;
	for (let index = 0; index < values.length; index += 3) {
		total +=
			values[index]! * WEIGHT_X +
			values[index + 1]! * WEIGHT_Y +
			values[index + 2]! * WEIGHT_Z;
	}

	return total;
}

function dotFloat64_(values: Float64Array): number {
	let total = 0;
	for (let index = 0; index < values.length; index += 3) {
		total +=
			values[index]! * WEIGHT_X +
			values[index + 1]! * WEIGHT_Y +
			values[index + 2]! * WEIGHT_Z;
	}

	return total;
}

function dotFloat32_(values: Float32Array): number {
	let total = 0;
	for (let index = 0; index < values.length; index += 3) {
		total +=
			values[index]! * WEIGHT_X +
			values[index + 1]! * WEIGHT_Y +
			values[index + 2]! * WEIGHT_Z;
	}

	return total;
}

function dotPlanes_([x, y, z]: Planes): number {
	let total = 0;
	for (let index = 0; index < x.length; index++) {
		total += x[index]! * WEIGHT_X + y[index]! * WEIGHT_Y + z[index]! * WEIGHT_Z;
	}

	return total;
}

function declareLayouts_(
	count: number,
	declare: (name: string, run: () => void) => void,
): void {
	const wanted = expected_(count);

	const tuples = tupleArray_(count);
	const objects = objectArray_(count);
	const flat = flatArray_(count);
	const aos64 = packed_(new Float64Array(count * 3), count);
	const aos32 = packed_(new Float32Array(count * 3), count);
	const soa = planes_(count);

	declare("[number, number, number][] — math-linear's Vec3", () => {
		assert.strictEqual(dotTuples_(tuples), wanted);
	});
	declare("{ x, y, z }[] — math-color's coord shape", () => {
		assert.strictEqual(dotObjects_(objects), wanted);
	});
	declare("number[] stride 3", () => {
		assert.strictEqual(dotFlat_(flat), wanted);
	});
	declare("Float64Array stride 3", () => {
		assert.strictEqual(dotFloat64_(aos64), wanted);
	});
	declare("Float32Array stride 3", () => {
		assert.strictEqual(dotFloat32_(aos32), wanted);
	});
	declare("3 × Float64Array planes", () => {
		assert.strictEqual(dotPlanes_(soa), wanted);
	});
}

durationCondition(`vec3 dot — ${SMALL.toLocaleString("en-US")} vectors`, () => {
	declareLayouts_(SMALL, (name, run) => {
		durationCase(name, { tags: { kind: "js" } }, run);
	});
});

durationCondition(`vec3 dot — ${LARGE.toLocaleString("en-US")} vectors`, () => {
	declareLayouts_(LARGE, (name, run) => {
		durationCase(name, { tags: { kind: "js" } }, run);
	});
});

resourceCondition(`vec3 dot — ${LARGE.toLocaleString("en-US")} vectors`, () => {
	// Only here: per-operation allocation has to be read against what the
	// harness itself costs, whereas against a near-zero duration the same case
	// would make the ratio column meaningless.
	resourceCase("empty case", { tags: { kind: "js", role: "floor" } }, () => {});

	declareLayouts_(LARGE, (name, run) => {
		resourceCase(name, { tags: { kind: "js" } }, run);
	});
});
