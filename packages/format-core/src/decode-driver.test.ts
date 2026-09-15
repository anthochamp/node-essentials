import { ByteAccumulator } from "@ac-kit/core";
import { describe, expect, it, vi } from "vitest";

import type { DecodeBuffer } from "./decode-buffer.js";
import { DecodeDriver } from "./decode-driver.js";
import type { DecodeSink } from "./decode-sink.js";
import type { Decoder } from "./decoder.js";

/**
 * Decodes NUL-terminated tokens, for driver tests independent of the line
 * codec.
 */
function tokenDecoder(): Decoder<string, Uint8Array> {
	return {
		decode(view) {
			const at = view.indexOf(0);
			if (at === -1) {
				return { status: "incomplete" };
			}
			return {
				status: "decoded",
				value: new TextDecoder().decode(view.subarray(0, at)),
				consumed: at + 1,
			};
		},
	};
}

function makeSink(): DecodeSink<string> & {
	decoded: string[];
	errors: unknown[];
	fatal: unknown[];
	incomplete: (number | undefined)[];
	pending: number[];
	truncated: (number | undefined)[];
} {
	const decoded: string[] = [];
	const errors: unknown[] = [];
	const fatal: unknown[] = [];
	const incomplete: (number | undefined)[] = [];
	const pending: number[] = [];
	const truncated: (number | undefined)[] = [];
	return {
		decoded,
		errors,
		fatal,
		incomplete,
		pending,
		truncated,
		onDecoded: (value) => decoded.push(value),
		onError: (error) => errors.push(error),
		onFatal: (error) => fatal.push(error),
		onIncomplete: (needAtLeast) => incomplete.push(needAtLeast),
		onPending: (frameTimeout) => pending.push(frameTimeout),
		onTruncated: (needAtLeast) => truncated.push(needAtLeast),
	};
}

function makeBuffer(): DecodeBuffer<Uint8Array> {
	return new ByteAccumulator(1024);
}

describe("DecodeDriver", () => {
	it("decodes multiple values across chunk boundaries", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("ab\0c"));
		driver.write(new TextEncoder().encode("d\0"));

		expect(sink.decoded).toStrictEqual(["ab", "cd"]);
	});

	it("reports incomplete and resumes once enough bytes arrive", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("partial"));
		expect(sink.incomplete).toStrictEqual([undefined]);
		expect(sink.decoded).toStrictEqual([]);

		driver.write(new TextEncoder().encode("\0"));
		expect(sink.decoded).toStrictEqual(["partial"]);
	});

	it("reports truncated when close() finds an unresolved incomplete", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("dangling"));
		driver.close();

		expect(sink.truncated).toStrictEqual([undefined]);
		expect(sink.decoded).toStrictEqual([]);
	});

	it("continues after a recoverable error", () => {
		const decoder: Decoder<string, Uint8Array> = {
			decode(view) {
				const at = view.indexOf(0);
				if (at === -1) return { status: "incomplete" };
				const text = new TextDecoder().decode(view.subarray(0, at));
				if (text === "bad") {
					return {
						status: "error",
						error: new Error("bad token"),
						consumed: at + 1,
					};
				}
				return { status: "decoded", value: text, consumed: at + 1 };
			},
		};
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder,
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("ok\0bad\0ok2\0"));

		expect(sink.decoded).toStrictEqual(["ok", "ok2"]);
		expect(sink.errors).toHaveLength(1);
	});

	it("skip consumes input without reporting a value or an error", () => {
		const decoder: Decoder<string, Uint8Array> = {
			decode(view) {
				const at = view.indexOf(0);
				if (at === -1) return { status: "incomplete" };
				const text = new TextDecoder().decode(view.subarray(0, at));
				if (text === "") {
					return { status: "skip", consumed: at + 1 };
				}
				return { status: "decoded", value: text, consumed: at + 1 };
			},
		};
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder,
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("a\0\0b\0"));

		expect(sink.decoded).toStrictEqual(["a", "b"]);
		expect(sink.errors).toStrictEqual([]);
	});

	it("stops on fatal and reports it once", () => {
		const decoder: Decoder<string, Uint8Array> = {
			decode() {
				return { status: "fatal", error: new Error("boom") };
			},
		};
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder,
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("x"));
		driver.write(new TextEncoder().encode("y"));

		expect(sink.fatal).toHaveLength(1);
	});

	it("re-arms a timer idle policy on repeated pending, and stops on close()", () => {
		let callCount = 0;
		const decoder: Decoder<string, Uint8Array> = {
			decode(_view) {
				callCount++;
				return { status: "pending", frameTimeout: 100 };
			},
		};
		const scheduled: Array<() => void> = [];
		const schedule = vi.fn((_delay: number, run: () => void) => {
			scheduled.push(run);
			return () => {
				/* cancel */
			};
		});
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder,
			buffer: makeBuffer(),
			sink,
			idle: { kind: "timer", schedule },
		});

		driver.write(new TextEncoder().encode("x"));
		expect(sink.pending).toStrictEqual([100]);
		expect(scheduled).toHaveLength(1);

		scheduled[0]!();
		expect(sink.pending).toStrictEqual([100, 100]);
		expect(callCount).toBe(2);

		driver.close();
		expect(sink.truncated).toStrictEqual([undefined]);
	});

	it("clear() discards buffered input and decoder state", () => {
		const reset = vi.fn();
		const decoder: Decoder<string, Uint8Array> = {
			decode() {
				return { status: "incomplete" };
			},
			reset,
		};
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder,
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("stuck"));
		expect(driver.buffered).toBeGreaterThan(0);

		driver.clear();
		expect(driver.buffered).toBe(0);
		expect(reset).toHaveBeenCalledOnce();
	});

	it("bails out of an in-flight loop when clear() is called from inside onDecoded", () => {
		const sink = makeSink();
		let driver!: DecodeDriver<string, Uint8Array>;
		const reentrantSink: DecodeSink<string> = {
			onDecoded(value, consumed, extra) {
				sink.onDecoded(value, consumed, extra);
				if (value === "a") {
					driver.clear();
				}
			},
			onError: (error, consumed) => sink.onError(error, consumed),
			onFatal: (error) => sink.onFatal(error),
			onIncomplete: (needAtLeast) => sink.onIncomplete(needAtLeast),
			onPending: (frameTimeout) => sink.onPending(frameTimeout),
			onTruncated: (needAtLeast) => sink.onTruncated(needAtLeast),
		};
		driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink: reentrantSink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("a\0b\0"));

		// "b" must never be decoded: clear() discarded it mid-loop.
		expect(sink.decoded).toStrictEqual(["a"]);
	});

	it("swapDecoder() replaces the decoder, taking effect on the next write()", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		// Buffered but incomplete under tokenDecoder (no NUL yet).
		driver.write(new TextEncoder().encode("AB"));
		expect(sink.decoded).toStrictEqual([]);

		// Matches net/core's Framer.swapCodec: takes effect on the next decode
		// attempt, not immediately — the buffered bytes are reinterpreted then.
		driver.swapDecoder({
			decode(view) {
				return {
					status: "decoded",
					value: `swapped:${view.length}`,
					consumed: view.length,
				};
			},
		});
		expect(sink.decoded).toStrictEqual([]);

		driver.write(new Uint8Array(0));
		expect(sink.decoded).toStrictEqual(["swapped:2"]);
	});

	it("discardBuffer() drops buffered input without resetting decoder state", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("partial"));
		expect(driver.buffered).toBeGreaterThan(0);
		driver.discardBuffer();
		expect(driver.buffered).toBe(0);
	});

	it("takeResidue() removes and returns buffered input", () => {
		const sink = makeSink();
		const driver = new DecodeDriver({
			decoder: tokenDecoder(),
			buffer: makeBuffer(),
			sink,
			idle: { kind: "exhausted" },
		});

		driver.write(new TextEncoder().encode("leftover"));
		const residue = driver.takeResidue();
		expect(new TextDecoder().decode(residue)).toBe("leftover");
		expect(driver.buffered).toBe(0);
	});
});
