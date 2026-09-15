import { Duplex } from "node:stream";

import { DuplexTransport } from "@ac-kit/net-transport-node";
import { expect, suite, test } from "vitest";

import { SmtpClient, SmtpProtocolError } from "./smtp-client.js";

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

function makeClient(): { duplex: FakeDuplex; client: SmtpClient } {
	const duplex = new FakeDuplex();
	const client = new SmtpClient(new DuplexTransport(duplex));
	return { duplex, client };
}

suite("SmtpClient", () => {
	suite("push event", () => {
		test("dispatches the 220 greeting as a push event", async () => {
			const duplex = new FakeDuplex();
			const client = new SmtpClient(new DuplexTransport(duplex));
			const pushPromise = client.wait("push");
			duplex.push(Buffer.from("220 mail.example.com ESMTP\r\n"));
			const [greeting] = await pushPromise;
			expect(greeting.code).toBe(220);
			expect(greeting.lines).toStrictEqual(["mail.example.com ESMTP"]);
		});
	});

	suite("command", () => {
		test("sends the command line with CRLF", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("NOOP");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("NOOP\r\n");
		});

		test("parses a single-line response", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("NOOP");
			duplex.push(Buffer.from("250 OK\r\n"));
			const response = await p;
			expect(response.code).toBe(250);
			expect(response.lines).toStrictEqual(["OK"]);
		});

		test("parses a multi-line response", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("EHLO test");
			duplex.push(
				Buffer.from("250-mail.example.com\r\n250-STARTTLS\r\n250 OK\r\n"),
			);
			const response = await p;
			expect(response.code).toBe(250);
			expect(response.lines).toStrictEqual([
				"mail.example.com",
				"STARTTLS",
				"OK",
			]);
		});
	});

	suite("ehlo", () => {
		test("sends EHLO with the given domain", async () => {
			const { duplex, client } = makeClient();
			const p = client.ehlo("test.local");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("EHLO test.local\r\n");
		});
	});

	suite("mailFrom", () => {
		test("sends MAIL FROM with angle brackets", async () => {
			const { duplex, client } = makeClient();
			const p = client.mailFrom("sender@example.com");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("MAIL FROM:<sender@example.com>\r\n");
		});

		test("appends extra parameters when provided", async () => {
			const { duplex, client } = makeClient();
			const p = client.mailFrom("sender@example.com", "SIZE=1000");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe(
				"MAIL FROM:<sender@example.com> SIZE=1000\r\n",
			);
		});
	});

	suite("rcptTo", () => {
		test("sends RCPT TO with angle brackets", async () => {
			const { duplex, client } = makeClient();
			const p = client.rcptTo("alice@example.com");
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("RCPT TO:<alice@example.com>\r\n");
		});
	});

	suite("data", () => {
		test("sends DATA, transmits the body, and returns the final response", async () => {
			const { duplex, client } = makeClient();
			const p = client.data("Subject: test\r\n\r\nHello");
			duplex.push(Buffer.from("354 Start mail input\r\n"));
			// Wait for the 354 to be processed, sendRaw to complete, and collect() to register
			await new Promise<void>((resolve) => setImmediate(resolve));
			duplex.push(Buffer.from("250 OK: queued\r\n"));
			const response = await p;
			expect(duplex.written[0]).toBe("DATA\r\n");
			expect(duplex.written[1]).toBe("Subject: test\r\n\r\nHello\r\n.\r\n");
			expect(response.code).toBe(250);
		});

		test("dot-stuffs lines starting with a period", async () => {
			const { duplex, client } = makeClient();
			const p = client.data(".leading dot\r\n");
			duplex.push(Buffer.from("354 Start mail input\r\n"));
			await new Promise<void>((resolve) => setImmediate(resolve));
			duplex.push(Buffer.from("250 OK\r\n"));
			await p;
			expect(duplex.written[1]).toBe("..leading dot\r\n.\r\n");
		});

		test("throws SmtpProtocolError when DATA response is not 354", async () => {
			const { duplex, client } = makeClient();
			const p = client.data("hello");
			duplex.push(Buffer.from("503 Bad sequence\r\n"));
			await expect(p).rejects.toBeInstanceOf(SmtpProtocolError);
		});
	});

	suite("quit", () => {
		test("sends QUIT", async () => {
			const { duplex, client } = makeClient();
			const p = client.quit();
			duplex.push(Buffer.from("221 Bye\r\n"));
			await p;
			expect(duplex.written[0]).toBe("QUIT\r\n");
		});
	});
});
