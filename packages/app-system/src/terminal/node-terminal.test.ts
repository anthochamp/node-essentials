import { EventEmitter } from "node:events";

import { afterEach, expect, suite, test, vi } from "vitest";

import { nodeTerminal } from "./node-terminal.js";

type MockStreamOptions = {
	isTTY?: boolean;
	columns?: number;
	rows?: number;
	colorDepth?: number;
};

function createMockStream(options?: MockStreamOptions): NodeJS.WriteStream {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		isTTY: options?.isTTY ?? false,
		columns: options?.columns ?? 80,
		rows: options?.rows ?? 24,
		getColorDepth: () => options?.colorDepth ?? 1,
		write: vi.fn(),
	}) as unknown as NodeJS.WriteStream;
}

afterEach(() => {
	vi.unstubAllEnvs();
});

suite("nodeTerminal", () => {
	test("reports a non-TTY stream as non-interactive with fallback dimensions", () => {
		const terminal = nodeTerminal(createMockStream({ isTTY: false }));

		expect(terminal.interactive).toBe(false);
		expect(terminal.columns).toBe(80);
		expect(terminal.rows).toBe(24);
		expect(terminal.colorDepth).toBe(1);
		// oxlint-disable-next-line typescript/unbound-method -- optional function-typed property on a plain object, not a class method needing `this`
		expect(terminal.enterAltScreen).toBeUndefined();
		// oxlint-disable-next-line typescript/unbound-method -- same as above
		expect(terminal.exitAltScreen).toBeUndefined();
		// oxlint-disable-next-line typescript/unbound-method -- same as above
		expect(terminal.clear).toBeUndefined();
	});

	test("reads dimensions and color depth from an interactive stream", () => {
		const stream = createMockStream({
			isTTY: true,
			columns: 120,
			rows: 40,
			colorDepth: 24,
		});
		const terminal = nodeTerminal(stream);

		expect(terminal.interactive).toBe(true);
		expect(terminal.columns).toBe(120);
		expect(terminal.rows).toBe(40);
		expect(terminal.colorDepth).toBe(24);
	});

	test("columns/rows stay live after the stream's dimensions change", () => {
		const stream = createMockStream({ isTTY: true, columns: 80, rows: 24 });
		const terminal = nodeTerminal(stream);

		(stream as unknown as { columns: number }).columns = 200;
		(stream as unknown as { rows: number }).rows = 60;

		expect(terminal.columns).toBe(200);
		expect(terminal.rows).toBe(60);
	});

	test("exposes enterAltScreen/exitAltScreen only when interactive", () => {
		const stream = createMockStream({ isTTY: true });
		const terminal = nodeTerminal(stream);

		// oxlint-disable-next-line typescript/unbound-method -- optional function-typed property on a plain object, not a class method needing `this`
		terminal.enterAltScreen?.();
		// oxlint-disable-next-line typescript/unbound-method -- same as above
		terminal.exitAltScreen?.();

		// oxlint-disable-next-line typescript/unbound-method -- vi.fn() mock property, not a class method needing `this`
		expect(stream.write).toHaveBeenNthCalledWith(1, "\u001B[?1049h");
		// oxlint-disable-next-line typescript/unbound-method -- same as above
		expect(stream.write).toHaveBeenNthCalledWith(2, "\u001B[?1049l");
	});

	test("clear() writes the clear-screen escape only when interactive", () => {
		const stream = createMockStream({ isTTY: true });
		const terminal = nodeTerminal(stream);

		terminal.clear?.();

		// oxlint-disable-next-line typescript/unbound-method -- vi.fn() mock property, not a class method needing `this`
		expect(stream.write).toHaveBeenCalledWith("\u001B[2J\u001B[3J\u001B[H");
	});

	test("notifies resize subscribers when the stream emits resize", () => {
		const stream = createMockStream({ isTTY: true });
		const terminal = nodeTerminal(stream);
		const listener = vi.fn();

		terminal.resize.subscribe(listener);
		stream.emit("resize");

		expect(listener).toHaveBeenCalledTimes(1);
	});

	test("detects unicode support via TERM on non-Windows", () => {
		vi.stubEnv("TERM", "linux");
		expect(nodeTerminal(createMockStream()).unicode).toBe(false);

		vi.stubEnv("TERM", "xterm-256color");
		expect(nodeTerminal(createMockStream()).unicode).toBe(true);
	});

	test("FORCE_HYPERLINK forces hyperlink support on", () => {
		vi.stubEnv("FORCE_HYPERLINK", "1");
		expect(nodeTerminal(createMockStream({ isTTY: false })).hyperlinks).toBe(
			true,
		);
	});

	test("hyperlinks are off for a non-interactive stream", () => {
		expect(nodeTerminal(createMockStream({ isTTY: false })).hyperlinks).toBe(
			false,
		);
	});

	test("hyperlinks are off under CI even when interactive", () => {
		vi.stubEnv("CI", "true");
		expect(nodeTerminal(createMockStream({ isTTY: true })).hyperlinks).toBe(
			false,
		);
	});
});
