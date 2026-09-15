import { Duplex } from "node:stream";

import { DuplexTransport } from "@ac-kit/net-transport-node";
import { expect, suite, test } from "vitest";

import { LmtpClient } from "./lmtp-client.js";

class FakeDuplex extends Duplex {
	readonly written: string[] = [];

	override _read(): void {}

	override _write(
		chunk: Buffer,
		_: BufferEncoding,
		callback: () => void,
	): void {
		this.written.push(chunk.toString());
		callback();
	}
}

function makeClient(): { duplex: FakeDuplex; client: LmtpClient } {
	const duplex = new FakeDuplex();
	const client = new LmtpClient(new DuplexTransport(duplex));
	return { duplex, client };
}

suite("LmtpClient", () => {
	suite("lhlo", () => {
		test("sends LHLO with the given domain", async () => {
			const { duplex, client } = makeClient();
			const p = client.lhlo("test.local");
			duplex.push(Buffer.from("250 localhost\r\n"));
			await p;
			expect(duplex.written[0]).toBe("LHLO test.local\r\n");
		});

		test("parses multi-line LHLO response", async () => {
			const { duplex, client } = makeClient();
			const p = client.lhlo("test.local");
			duplex.push(Buffer.from("250-localhost\r\n250 PIPELINING\r\n"));
			const response = await p;
			expect(response.code).toBe(250);
			expect(response.lines).toStrictEqual(["localhost", "PIPELINING"]);
		});
	});

	suite("dataMulti", () => {
		test("sends DATA, body, and reads one response per recipient", async () => {
			const { duplex, client } = makeClient();
			const p = client.dataMulti("Subject: test\r\n\r\nHello", 2);
			duplex.push(Buffer.from("354 Start mail input\r\n"));
			// Wait for the 354 to be processed, sendRaw to complete, and first collect() to register
			await new Promise<void>((resolve) => setImmediate(resolve));
			duplex.push(Buffer.from("250 OK: delivered to alice\r\n"));
			await Promise.resolve(); // let second collect() register
			duplex.push(Buffer.from("250 OK: delivered to bob\r\n"));
			const responses = await p;

			expect(duplex.written[0]).toBe("DATA\r\n");
			expect(duplex.written[1]).toBe("Subject: test\r\n\r\nHello\r\n.\r\n");
			expect(responses).toHaveLength(2);
			expect(responses[0]?.code).toBe(250);
			expect(responses[1]?.code).toBe(250);
		});

		test("dot-stuffs lines starting with a period", async () => {
			const { duplex, client } = makeClient();
			const p = client.dataMulti(".leading dot\r\n", 1);
			duplex.push(Buffer.from("354 Start mail input\r\n"));
			await new Promise<void>((resolve) => setImmediate(resolve));
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[1]).toBe("..leading dot\r\n.\r\n");
		});

		test("returns per-recipient responses in RCPT TO order", async () => {
			const { duplex, client } = makeClient();
			const p = client.dataMulti("Hello", 3);
			duplex.push(Buffer.from("354 Start mail input\r\n"));
			await new Promise<void>((resolve) => setImmediate(resolve));
			duplex.push(Buffer.from("250 OK\r\n"));
			await Promise.resolve();
			duplex.push(Buffer.from("550 User unknown\r\n"));
			await Promise.resolve();
			duplex.push(Buffer.from("250 OK\r\n"));
			const responses = await p;
			expect(responses[0]?.code).toBe(250);
			expect(responses[1]?.code).toBe(550);
			expect(responses[2]?.code).toBe(250);
		});

		test("inherits MAIL FROM and RCPT TO from SmtpClient", async () => {
			const { duplex, client } = makeClient();
			const p = client.mailFrom("sender@example.com");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("MAIL FROM:<sender@example.com>\r\n");
		});
	});
});
