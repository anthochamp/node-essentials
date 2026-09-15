import { Duplex } from "node:stream";

import { DuplexTransport } from "@ac-kit/net-transport-node";
import { expect, suite, test } from "vitest";

import { SocketmapClient } from "./socketmap-client.js";

class FakeDuplex extends Duplex {
	readonly written: Buffer[] = [];

	override _read(): void {}

	override _write(
		chunk: Buffer,
		_: BufferEncoding,
		callback: () => void,
	): void {
		this.written.push(chunk);
		callback();
	}
}

function makeClient(): { duplex: FakeDuplex; client: SocketmapClient } {
	const duplex = new FakeDuplex();
	const client = new SocketmapClient(new DuplexTransport(duplex));
	return { duplex, client };
}

suite("SocketmapClient", () => {
	suite("lookup", () => {
		test("sends a netstring-framed table+key query", async () => {
			const { duplex, client } = makeClient();
			const lookupPromise = client.lookup("forward", "user@example.com");
			duplex.push(Buffer.from("9:OK result,"));
			await lookupPromise;
			// The netstring encoder returns the frame vectored — length header,
			// payload, terminator — so the payload is never copied. The bytes on the
			// wire are what matters, not how many writes carried them.
			expect(Buffer.concat(duplex.written).toString()).toBe(
				"24:forward user@example.com,",
			);
		});

		test("returns status and value from OK response", async () => {
			const { duplex, client } = makeClient();
			const lookupPromise = client.lookup("forward", "user@example.com");
			duplex.push(Buffer.from("9:OK result,"));
			const result = await lookupPromise;
			expect(result).toStrictEqual({ status: "OK", value: "result" });
		});

		test("returns status with empty value for status-only response", async () => {
			const { duplex, client } = makeClient();
			const lookupPromise = client.lookup("forward", "user@example.com");
			duplex.push(Buffer.from("8:NOTFOUND,"));
			const result = await lookupPromise;
			expect(result).toStrictEqual({ status: "NOTFOUND", value: "" });
		});

		test("returns TEMP status for transient errors", async () => {
			const { duplex, client } = makeClient();
			const lookupPromise = client.lookup("forward", "x");
			duplex.push(Buffer.from("24:TEMP backend unavailable,"));
			const result = await lookupPromise;
			expect(result).toStrictEqual({
				status: "TEMP",
				value: "backend unavailable",
			});
		});

		test("is aborted when signal is already aborted", async () => {
			const { client } = makeClient();
			const controller = new AbortController();
			controller.abort(new Error("cancelled"));
			await expect(
				client.lookup("forward", "x", { signal: controller.signal }),
			).rejects.toThrowError(Error);
		});
	});
});
