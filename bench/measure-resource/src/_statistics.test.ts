import { describe, expect, it } from "vitest";

import { composeResourceBenchStatistics } from "./_statistics.js";
import { ResourceBenchSample } from "./_types.js";

function sample_(
	overrides: Partial<ResourceBenchSample> = {},
): ResourceBenchSample {
	return {
		operations: 100,
		cpuTimeMs: 0.01,
		allocatedBytes: 64,
		heapPeakBytes: 1_000_000,
		rssBytes: 30_000_000,
		gcCount: 0,
		gcPauseMs: 0,
		...overrides,
	};
}

const HEAP_LIMIT_ = 4_000_000_000;

describe("composeResourceBenchStatistics", () => {
	it("should reject an empty sample set rather than invent a summary", () => {
		expect(() => composeResourceBenchStatistics([], HEAP_LIMIT_)).toThrow(
			RangeError,
		);
	});

	it("should report the median rate, not the mean", () => {
		// One batch absorbed a collection and allocated ten times the rest.
		const samples = [
			sample_({ allocatedBytes: 64 }),
			sample_({ allocatedBytes: 64 }),
			sample_({ allocatedBytes: 640 }),
		];

		expect(
			composeResourceBenchStatistics(samples, HEAP_LIMIT_).allocatedBytes,
		).toBe(64);
	});

	it("should report peaks as maxima, since the question is what had to fit", () => {
		const samples = [
			sample_({ heapPeakBytes: 1_000_000, rssBytes: 30_000_000 }),
			sample_({ heapPeakBytes: 9_000_000, rssBytes: 50_000_000 }),
			sample_({ heapPeakBytes: 2_000_000, rssBytes: 31_000_000 }),
		];

		const statistics = composeResourceBenchStatistics(samples, HEAP_LIMIT_);

		expect(statistics.heapPeakBytes).toBe(9_000_000);
		expect(statistics.rssPeakBytes).toBe(50_000_000);
	});

	it("should total the operations across batches", () => {
		const samples = [
			sample_({ operations: 10 }),
			sample_({ operations: 20 }),
			sample_({ operations: 30 }),
		];

		const statistics = composeResourceBenchStatistics(samples, HEAP_LIMIT_);

		expect(statistics.operations).toBe(60);
		expect(statistics.samples).toBe(3);
	});

	it("should take the gc share from totals, not from a ratio of medians", () => {
		// The collection landed entirely in one batch; dividing its pause by
		// another batch's CPU time would overstate the share.
		const samples = [
			sample_({ cpuTimeMs: 1, gcPauseMs: 0 }),
			sample_({ cpuTimeMs: 1, gcPauseMs: 0 }),
			sample_({ cpuTimeMs: 1, gcPauseMs: 1.5 }),
		];

		expect(
			composeResourceBenchStatistics(samples, HEAP_LIMIT_).gcTimeRatio,
		).toBe(0.5);
	});

	it("should express the heap peak as a share of the limit", () => {
		const statistics = composeResourceBenchStatistics(
			[sample_({ heapPeakBytes: 400 })],
			1000,
		);

		expect(statistics.heapLimitRatio).toBe(0.4);
	});

	it("should report a zero share rather than dividing by an absent limit", () => {
		const statistics = composeResourceBenchStatistics(
			[sample_({ cpuTimeMs: 0, gcPauseMs: 0 })],
			0,
		);

		expect(statistics.heapLimitRatio).toBe(0);
		// No CPU time means the share is undefined, not zero.
		expect(statistics.gcTimeRatio).toBeNull();
	});

	it("should report no gc series at all when the runtime cannot observe one", () => {
		const statistics = composeResourceBenchStatistics(
			[sample_({ gcCount: null, gcPauseMs: null })],
			HEAP_LIMIT_,
		);

		expect(statistics.gcCount).toBeNull();
		expect(statistics.gcPauseMs).toBeNull();
		expect(statistics.gcTimeRatio).toBeNull();
	});
});
