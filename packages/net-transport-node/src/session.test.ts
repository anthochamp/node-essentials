import { Duplex } from "node:stream";

import { createLineCodec } from "@ac-kit/format-core";
import type { ExchangeOptions, ExchangeRegistry } from "@ac-kit/net-core";
import {
	type BaseSessionEvents,
	KeyedRegistry,
	ScanningRegistry,
	Session,
} from "@ac-kit/net-core";
import { expect, suite, test } from "vitest";

import { DuplexTransport } from "./duplex-transport.js";

class FakeDuplex extends Duplex {
	readonly written: string[] = [];

	override _read(): void {}

	override _write(
		chunk: Buffer,
		_encoding: BufferEncoding,
		callback: () => void,
	): void {
		this.written.push(chunk.toString());
		callback();
	}
}

/** Never emits `close`, exposing sessions that rely on it to reject. */
class SilentDuplex extends FakeDuplex {
	override destroy(): this {
		return this;
	}
}

function flush(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve));
}

type TestEvents = BaseSessionEvents & { push: [line: string] };

class TestSession extends Session<string, string, TestEvents, string> {
	readonly unsolicited: string[] = [];

	constructor(stream: Duplex, registry?: ExchangeRegistry<string, string>) {
		super({
			transport: new DuplexTransport(stream),
			codec: createLineCodec("utf-8"),
			maxBufferSize: 64 * 1024,
			registry,
		});
	}

	protected override routeFrame(frame: string): void {
		if (!this.offer(frame)) {
			this.unsolicited.push(frame);
		}
	}

	/** One line in, one line out. */
	call(
		command: string,
		options?: ExchangeOptions<string, string>,
	): Promise<string[]> {
		return this.request(command, () => "complete", options);
	}

	/** Collects until a line equal to `terminator`. */
	callUntil(command: string, terminator: string): Promise<string[]> {
		return this.request(command, (frame) =>
			frame === terminator ? "complete" : "accumulate",
		);
	}
}

suite("Session", () => {
	suite("correlation", () => {
		test("matches pipelined replies in order", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);

			const first = session.call("ONE");
			const second = session.call("TWO");
			await flush();
			duplex.push(Buffer.from("r1\r\nr2\r\n"));

			expect(await first).toStrictEqual(["r1"]);
			expect(await second).toStrictEqual(["r2"]);
		});

		test("surfaces frames no exchange claims as unsolicited", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);

			duplex.push(Buffer.from("* greeting\r\n"));
			await flush();

			expect(session.unsolicited).toStrictEqual(["* greeting"]);
		});

		test("resolves out-of-order replies through a keyed registry", async () => {
			const duplex = new FakeDuplex();
			const registry = new KeyedRegistry<string, string>({
				keyOf: (frame) => frame.split(" ")[0],
			});
			const session = new TestSession(duplex, registry);

			const first = session.call("CMD a", { key: "a" });
			const second = session.call("CMD b", { key: "b" });
			await flush();

			// Answered in reverse order, which strict FIFO could not handle.
			duplex.push(Buffer.from("b done\r\na done\r\n"));

			expect(await second).toStrictEqual(["b done"]);
			expect(await first).toStrictEqual(["a done"]);
		});
	});

	suite("abort", () => {
		test("discard rejects the caller but keeps the stream synchronised", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);
			const controller = new AbortController();

			const abandoned = session.call("SLOW", { signal: controller.signal });
			const next = session.call("NEXT");
			await flush();

			controller.abort(new Error("timed out"));
			await expect(abandoned).rejects.toThrow();

			// The abandoned command's reply still arrives; it must be absorbed,
			// not mis-delivered to NEXT.
			duplex.push(Buffer.from("late-reply\r\nnext-reply\r\n"));

			expect(await next).toStrictEqual(["next-reply"]);
			expect(session.unsolicited).toStrictEqual([]);
		});

		test("close tears the session down", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);
			const controller = new AbortController();

			const abandoned = session.call("SLOW", {
				signal: controller.signal,
				abortPolicy: "close",
			});
			const other = session.call("OTHER");
			await flush();

			controller.abort(new Error("fatal"));

			await expect(abandoned).rejects.toThrow();
			await expect(other).rejects.toThrow();
		});

		test("rejects immediately when the signal is already aborted", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);
			const controller = new AbortController();
			controller.abort(new Error("already"));

			await expect(
				session.call("X", { signal: controller.signal }),
			).rejects.toThrow();
			expect(session.pendingExchanges).toBe(0);
		});

		test("timeoutMs abandons an unanswered command", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);

			await expect(session.call("HANGS", { timeoutMs: 5 })).rejects.toThrow();
		});
	});

	suite("lifecycle", () => {
		test("destroy rejects pending exchanges without waiting on the transport", async () => {
			const duplex = new SilentDuplex();
			const session = new TestSession(duplex);

			const pending = session.call("NEVER");
			await flush();
			session.destroy();

			await expect(pending).rejects.toThrow();
		});

		test("connection close rejects everything outstanding", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(duplex);

			const pending = session.call("NEVER");
			await flush();
			duplex.destroy();

			await expect(pending).rejects.toThrow(Error);
		});
	});

	suite("scanning depth", () => {
		test("depth 1 refuses to look past the oldest exchange", async () => {
			const duplex = new FakeDuplex();
			const session = new TestSession(
				duplex,
				new ScanningRegistry<string>({ maxDepth: 1 }),
			);

			const collecting = session.callUntil("MULTI", "END");
			await flush();
			duplex.push(Buffer.from("part\r\nEND\r\n"));

			expect(await collecting).toStrictEqual(["part", "END"]);
		});
	});
});
