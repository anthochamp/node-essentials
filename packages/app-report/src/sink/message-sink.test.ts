import { expect, suite, test, vi } from "vitest";

import type { ReportEvent } from "../events.js";
import { createMessageSink } from "./message-sink.js";

suite("createMessageSink", () => {
	test("serializes each event and hands it to post", () => {
		const post = vi.fn();
		const sink = createMessageSink<number>(post);

		const event: ReportEvent<number> = {
			kind: "data",
			timestamp: 1,
			scopeId: null,
			data: 42,
		};
		void sink.write(event);

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith(event);
	});

	test("applies the given serialize options", () => {
		const post = vi.fn();
		const sink = createMessageSink<Uint8Array>(post, {
			serialize: { mode: "structured-clone" },
		});
		const bytes = new Uint8Array([1, 2, 3]);

		void sink.write({ kind: "data", timestamp: 1, scopeId: null, data: bytes });

		expect(post).toHaveBeenCalledWith(expect.objectContaining({ data: bytes }));
	});

	test("flush() and close() are no-ops", () => {
		const post = vi.fn();
		const sink = createMessageSink<never>(post);

		void sink.flush();
		void sink.close();

		expect(post).not.toHaveBeenCalled();
	});
});
