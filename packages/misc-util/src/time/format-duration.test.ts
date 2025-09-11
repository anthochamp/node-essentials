import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration.js";

describe("formatDuration", () => {
	it("should format durations less than 1ms", () => {
		expect(formatDuration(0.5)).toBe("500µs");
		expect(formatDuration(0.999)).toBe("999µs");
	});

	it("should format durations less than 1 second", () => {
		expect(formatDuration(1)).toBe("1ms");
		expect(formatDuration(999)).toBe("999ms");
	});

	it("should format durations less than 1 minute", () => {
		expect(formatDuration(1000)).toBe("1s");
		expect(formatDuration(1500)).toBe("1s 500ms");
		expect(formatDuration(59000)).toBe("59s");
	});

	it("should format durations less than 1 hour", () => {
		expect(formatDuration(60000)).toBe("1m");
		expect(formatDuration(65000)).toBe("1m 5s");
		expect(formatDuration(3599000)).toBe("59m 59s");
	});

	it("should format durations of 1 hour or more", () => {
		expect(formatDuration(3600000)).toBe("1h");
		expect(formatDuration(3660000)).toBe("1h 1m");
		expect(formatDuration(7320000)).toBe("2h 2m");
	});

	it("should handle zero and negative durations", () => {
		expect(formatDuration(0)).toBe("0ms");
		expect(formatDuration(-1500)).toBe("-1s 500ms");
	});
});
