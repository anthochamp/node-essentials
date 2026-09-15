import assert from "node:assert";

import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { ByteBuilder, ByteReader } from "@ac-kit/core";
import { encodeVlq, readVlq, vlqDecoder } from "@ac-kit/format-varint";

/**
 * Base-128 VLQ, as `@ac-kit/format-asn1` used to do it against what
 * `@ac-kit/format-varint` now does.
 *
 * The shared codec has to be paid for three ways: the decode loop moved behind
 * a call, the encoder returns a `Uint8Array` where the old one pushed into a
 * `number[]`, and the `Decoder` form allocates a `DecodeResult` per value. An
 * X.509 certificate decodes a few hundred OID arcs, so per-arc cost is the
 * thing to watch.
 */

const SAMPLING = {
	warmup: 5,
	minRuns: 10,
	maxRuns: 120,
	minTimeMs: 200,
	maxTimeMs: 4_000,
	subtractHarnessOverhead: true,
} as const;

/** Arc magnitudes as certificates actually carry them, plus a few large ones. */
const ARCS: readonly number[] = (() => {
	const values: number[] = [];
	for (let index = 0; index < 4_096; index++) {
		values.push(index % 7 === 0 ? 113_549 + index : (index * 37) % 128);
	}

	return values;
})();

const DECODE_CONTEXT = { atEof: false, timedOut: false } as const;

/** The implementation `format-asn1` carried before the codec was extracted. */
function arcToVlqLegacy_(arc: number): number[] {
	if (arc === 0) return [0x00];
	const bytes: number[] = [];
	let v = arc;
	while (v > 0) {
		bytes.unshift(v & 0x7f);
		v = Math.floor(v / 128);
	}
	for (let i = 0; i < bytes.length - 1; i++) bytes[i]! |= 0x80;
	return bytes;
}

function encodeLegacy_(arcs: readonly number[]): Uint8Array {
	const bytes: number[] = [];
	for (const arc of arcs) bytes.push(...arcToVlqLegacy_(arc));
	return new Uint8Array(bytes);
}

function encodeShared_(arcs: readonly number[]): Uint8Array {
	const builder = new ByteBuilder();
	for (const arc of arcs) {
		builder.write(encodeVlq(arc));
	}
	return builder.toBytes();
}

const ENCODED = encodeLegacy_(ARCS);
assert.deepStrictEqual([...encodeShared_(ARCS)], [...ENCODED]);

/** The decode loop `format-asn1` carried, capped at 32 bits by its shift. */
function decodeLegacy_(contents: Uint8Array): number[] {
	const arcs: number[] = [];
	let arc = 0;
	for (const b of contents) {
		arc = (arc << 7) | (b & 0x7f);
		if ((b & 0x80) === 0) {
			arcs.push(arc);
			arc = 0;
		}
	}
	return arcs;
}

function decodeShared_(contents: Uint8Array): number[] {
	const reader = new ByteReader(contents);
	const arcs: number[] = [];
	while (!reader.atEnd) {
		arcs.push(readVlq(reader));
	}
	return arcs;
}

function decodeThroughDecoder_(contents: Uint8Array): number[] {
	const arcs: number[] = [];
	let offset = 0;
	while (offset < contents.length) {
		const result = vlqDecoder.decode(contents.subarray(offset), DECODE_CONTEXT);
		if (result.status !== "decoded") {
			throw new Error(`unexpected ${result.status}`);
		}
		arcs.push(result.value);
		offset += result.consumed;
	}
	return arcs;
}

assert.deepStrictEqual(decodeLegacy_(ENCODED), [...ARCS]);
assert.deepStrictEqual(decodeShared_(ENCODED), [...ARCS]);
assert.deepStrictEqual(decodeThroughDecoder_(ENCODED), [...ARCS]);

durationCondition(
	`VLQ encode, ${ARCS.length.toLocaleString("en-US")} arcs`,
	{ sampling: SAMPLING },
	() => {
		durationCase("format-asn1's former number[] and spread", () => {
			assert.strictEqual(encodeLegacy_(ARCS).length, ENCODED.length);
		});
		durationCase("encodeVlq into a ByteBuilder", () => {
			assert.strictEqual(encodeShared_(ARCS).length, ENCODED.length);
		});
	},
);

durationCondition(
	`VLQ decode, ${ARCS.length.toLocaleString("en-US")} arcs`,
	{ sampling: SAMPLING },
	() => {
		durationCase("format-asn1's former inline loop (32-bit)", () => {
			assert.strictEqual(decodeLegacy_(ENCODED).length, ARCS.length);
		});
		durationCase("readVlq over a ByteReader", () => {
			assert.strictEqual(decodeShared_(ENCODED).length, ARCS.length);
		});
		durationCase("vlqDecoder, one DecodeResult per arc", () => {
			assert.strictEqual(decodeThroughDecoder_(ENCODED).length, ARCS.length);
		});
	},
);
