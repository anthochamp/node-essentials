import type { ReportEvent } from "@ac-kit/app-report";
import { expect, suite, test } from "vitest";

import { createChildProcessMessageSink } from "./child-process-message-sink.js";

type SentMessage = {
	message: unknown;
	callback: (error: Error | null) => void;
};

function fakeTarget(): {
	sent: SentMessage[];
	send: (message: unknown, callback: (error: Error | null) => void) => boolean;
} {
	const sent: SentMessage[] = [];
	return {
		sent,
		send(message, callback) {
			sent.push({ message, callback });
			return true;
		},
	};
}

const event: ReportEvent<never> = {
	kind: "scope-start",
	timestamp: 42,
	scopeId: "s1",
	parentId: null,
	title: "a suite",
	key: "suite:a",
};

suite("createChildProcessMessageSink", () => {
	test("serializes each event onto the channel", () => {
		const target = fakeTarget();
		const sink = createChildProcessMessageSink<never>(target);

		void sink.write(event);

		expect(target.sent).toHaveLength(1);
		expect(target.sent[0]?.message).toMatchObject({
			kind: "scope-start",
			scopeId: "s1",
			title: "a suite",
		});
	});

	test("reports a refused message instead of dropping it silently", () => {
		const target = fakeTarget();
		const errors: unknown[] = [];
		const sink = createChildProcessMessageSink<never>(target, {
			onSendError: (error) => errors.push(error),
		});

		void sink.write(event);
		const failure = new Error("channel closed");
		target.sent[0]?.callback(failure);

		expect(errors).toEqual([failure]);
	});

	test("a delivered message reports no error", () => {
		const target = fakeTarget();
		const errors: unknown[] = [];
		const sink = createChildProcessMessageSink<never>(target, {
			onSendError: (error) => errors.push(error),
		});

		void sink.write(event);
		target.sent[0]?.callback(null);

		expect(errors).toEqual([]);
	});

	test("a target with no channel is a no-op, not a crash", () => {
		const sink = createChildProcessMessageSink<never>({});

		expect(() => void sink.write(event)).not.toThrow();
	});

	test("serialization options reach the serializer", () => {
		const target = fakeTarget();
		const sink = createChildProcessMessageSink<Uint8Array>(target, {
			serialize: { mode: "json" },
		});

		void sink.write({
			kind: "data",
			timestamp: 1,
			scopeId: null,
			data: new Uint8Array([1, 2, 3]),
		});

		expect(target.sent[0]?.message).not.toBeInstanceOf(Uint8Array);
	});
});
