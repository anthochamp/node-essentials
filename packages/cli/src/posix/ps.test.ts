import {
	execAsync,
	ProcessExitWithOutputError,
} from "@ac-essentials/misc-util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ps, psParseDuration } from "./ps.js";

vi.mock(import("@ac-essentials/misc-util"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

describe("ps", () => {
	const execAsyncMock = vi.mocked(execAsync);

	beforeEach(() => {
		execAsyncMock.mockReset();
	});

	it("should execute 'ps' command with default options", async () => {
		execAsyncMock.mockResolvedValue({
			stdout: "  PID TTY          TIME CMD\n 1234 pts/0    00:00:00 bash\n",
			stderr: "",
		});

		const result = await ps({
			fields: ["pid", "tty", "time", "cmd"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			expect.stringContaining("o 'pid,tty,time,cmd'"),
			expect.anything(),
		);
		expect(result).toEqual([
			{ pid: 1234, tty: "pts/0", time: "00:00:00", cmd: "bash" },
		]);
	});

	it("should filter processes by user", async () => {
		execAsyncMock.mockResolvedValue({
			stdout: "  PID TTY          TIME CMD\n 1234 pts/0    00:00:00 bash\n",
			stderr: "",
		});

		await ps({ selector: { user: ["testuser"] } });

		expect(execAsyncMock).toHaveBeenCalledWith(
			expect.stringContaining("U 'testuser'"),
			expect.anything(),
		);
	});

	it("should select specific fields", async () => {
		execAsyncMock.mockResolvedValue({
			stdout: "  PID CMD\n 1234 bash\n",
			stderr: "",
		});

		const result = await ps({ fields: ["pid", "cmd"] });

		expect(execAsyncMock).toHaveBeenCalledWith(
			expect.stringContaining("o 'pid,cmd'"),
			expect.anything(),
		);
		expect(result).toEqual([{ pid: 1234, cmd: "bash" }]);
	});

	it("should handle empty output", async () => {
		execAsyncMock.mockResolvedValue({
			stdout: "",
			stderr: "",
		});

		const result = await ps();

		expect(result).toEqual([]);
	});

	it("should handle exec errors", async () => {
		execAsyncMock.mockRejectedValue(new Error("Command failed"));

		await expect(ps()).rejects.toThrow("Command failed");
	});

	it("should handle exec errors with exit code 1 and output", async () => {
		execAsyncMock.mockRejectedValue(
			new ProcessExitWithOutputError(
				1,
				null,
				false,
				"  PID TTY          TIME CMD\n",
				"",
			),
		);

		const result = await ps();

		expect(result).toEqual([]);
	});

	describe("psParseDuration", () => {
		it("should parse seconds", () => {
			expect(psParseDuration("45")).toBe(45000);
		});

		it("should parse minutes and seconds", () => {
			expect(psParseDuration("05:30")).toBe(330000);
		});

		it("should parse hours, minutes, and seconds", () => {
			expect(psParseDuration("02:15:20")).toBe(8120000);
		});

		it("should parse days, hours, minutes, and seconds", () => {
			expect(psParseDuration("1-03:20:15")).toBe(98415000);
		});

		it("should handle single digit days", () => {
			expect(psParseDuration("3-01:02:03")).toBe(262923000);
		});

		it("should return 0 for invalid formats", () => {
			expect(() => psParseDuration("invalid")).toThrow();
			expect(() => psParseDuration("1:2")).toThrow();
			expect(() => psParseDuration("1-2:3")).toThrow();
		});
	});
});
