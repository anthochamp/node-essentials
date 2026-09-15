import assert from "node:assert";
import { inspect } from "node:util";

import { durationCase } from "@ac-bench/measure-duration";
import { hashString, randomUint32Values } from "@ac-bench/util";

export interface Record_ {
	id: number;
	name: string;
	enabled: boolean;
	ratio: number;
	tags: string[];
	nested: { a: number; b: string; c: number[] };
}

export const PAYLOAD: Record_[] = randomUint32Values(2_000).map(
	(value, index) => ({
		id: value,
		name: `record-${value.toString(36)}`,
		enabled: index % 2 === 0,
		ratio: value / 0x1_0000_0000,
		tags: [`t${value % 50}`, `t${index % 50}`],
		nested: {
			a: value,
			b: `n${index}`,
			c: [value % 7, value % 11, value % 13],
		},
	}),
);

/**
 * Registers one bench case that produces a string and verifies its hash did not
 * change between runs.
 *
 * Contenders emit different text (sorted keys, reference markers), so the
 * expected hash is taken from each contender's own first run. The groups
 * compare cost at equal input, not agreement.
 */
export function textCase(
	name: string,
	kind: string,
	produce: () => string,
	tags?: Record<string, string>,
): void {
	const wanted = hashString(produce());
	durationCase(name, { tags: { ...tags, kind } }, () =>
		assert.strictEqual(hashString(produce()), wanted),
	);
}

interface Cyclic extends Record_ {
	parent: Cyclic | null;
	children: Cyclic[];
}

/** A tree whose every node points back at its parent. */
export function buildCircularGraph(): Cyclic {
	const make = (record: Record_, parent: Cyclic | null): Cyclic => ({
		...record,
		parent,
		children: [],
	});
	const root = make(PAYLOAD[0] as Record_, null);
	const nodes: Cyclic[] = [root];
	for (let index = 1; index < 500; index++) {
		const parent = nodes[(index - 1) >> 2] as Cyclic;
		const node = make(PAYLOAD[index] as Record_, parent);
		parent.children.push(node);
		nodes.push(node);
	}
	root.parent = root;
	return root;
}

export function buildErrorPayload(): unknown {
	return PAYLOAD.slice(0, 200).map((record) => {
		const cause = new TypeError(`cause for ${record.name}`);
		return {
			...record,
			failure: new Error(`failed ${record.name}`, { cause }),
		};
	});
}

export { inspect };
