import { Duplex } from "node:stream";

import { DuplexTransport } from "@ac-kit/net-transport-node";
import { expect, suite, test } from "vitest";

import { Pop3Client } from "./pop3-client.js";

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

function makeClient(): { duplex: FakeDuplex; client: Pop3Client } {
	const duplex = new FakeDuplex();
	const client = new Pop3Client(new DuplexTransport(duplex));
	return { duplex, client };
}

suite("Pop3Client", () => {
	suite("push event", () => {
		test("dispatches the +OK greeting as a push event", async () => {
			const duplex = new FakeDuplex();
			const client = new Pop3Client(new DuplexTransport(duplex));
			const pushPromise = client.wait("push");
			duplex.push(Buffer.from("+OK POP3 server ready\r\n"));
			const [greeting] = await pushPromise;
			expect(greeting.ok).toBe(true);
			expect(greeting.text).toBe("POP3 server ready");
		});
	});

	suite("command", () => {
		test("sends the command with CRLF", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("NOOP");
			duplex.push(Buffer.from("+OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("NOOP\r\n");
		});

		test("parses +OK response", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("NOOP");
			duplex.push(Buffer.from("+OK\r\n"));
			const response = await p;
			expect(response.ok).toBe(true);
			expect(response.text).toBe("");
		});

		test("parses -ERR response", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("PASS wrong");
			duplex.push(Buffer.from("-ERR invalid password\r\n"));
			const response = await p;
			expect(response.ok).toBe(false);
			expect(response.text).toBe("invalid password");
		});
	});

	suite("commandMultiline", () => {
		test("collects body lines until the terminating dot", async () => {
			const { duplex, client } = makeClient();
			const p = client.commandMultiline("CAPA");
			duplex.push(
				Buffer.from(
					"+OK Capability list follows\r\nTOP\r\nUIDL\r\nSTLS\r\n.\r\n",
				),
			);
			const response = await p;
			expect(response.ok).toBe(true);
			expect(response.lines).toStrictEqual(["TOP", "UIDL", "STLS"]);
		});

		test("returns empty lines on -ERR without reading body", async () => {
			const { duplex, client } = makeClient();
			const p = client.commandMultiline("CAPA");
			duplex.push(Buffer.from("-ERR Not supported\r\n"));
			const response = await p;
			expect(response.ok).toBe(false);
			expect(response.lines).toStrictEqual([]);
		});

		test("dot-unstuffs lines starting with ..", async () => {
			const { duplex, client } = makeClient();
			const p = client.commandMultiline("RETR 1");
			duplex.push(Buffer.from("+OK\r\n..leading dot\r\nnormal\r\n.\r\n"));
			const response = await p;
			expect(response.lines[0]).toBe(".leading dot");
			expect(response.lines[1]).toBe("normal");
		});
	});

	suite("user / pass", () => {
		test("sends USER with username", async () => {
			const { duplex, client } = makeClient();
			const p = client.user("alice");
			duplex.push(Buffer.from("+OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("USER alice\r\n");
		});

		test("sends PASS with password", async () => {
			const { duplex, client } = makeClient();
			const p = client.pass("secret");
			duplex.push(Buffer.from("+OK logged in\r\n"));
			await p;
			expect(duplex.written[0]).toBe("PASS secret\r\n");
		});
	});

	suite("list", () => {
		test("sends LIST and returns all scan listings", async () => {
			const { duplex, client } = makeClient();
			const p = client.list();
			duplex.push(Buffer.from("+OK 2 messages\r\n1 1234\r\n2 5678\r\n.\r\n"));
			const response = await p;
			expect(duplex.written[0]).toBe("LIST\r\n");
			expect(response.lines).toStrictEqual(["1 1234", "2 5678"]);
		});

		test("listOne sends LIST msg and returns single-line", async () => {
			const { duplex, client } = makeClient();
			const p = client.listOne(1);
			duplex.push(Buffer.from("+OK 1 1234\r\n"));
			const response = await p;
			expect(duplex.written[0]).toBe("LIST 1\r\n");
			expect(response.ok).toBe(true);
		});
	});

	suite("retr", () => {
		test("sends RETR and returns message lines", async () => {
			const { duplex, client } = makeClient();
			const p = client.retr(1);
			duplex.push(
				Buffer.from("+OK 1234 octets\r\nSubject: test\r\n\r\nHello\r\n.\r\n"),
			);
			const response = await p;
			expect(duplex.written[0]).toBe("RETR 1\r\n");
			expect(response.lines).toStrictEqual(["Subject: test", "", "Hello"]);
		});
	});

	suite("quit", () => {
		test("sends QUIT", async () => {
			const { duplex, client } = makeClient();
			const p = client.quit();
			duplex.push(Buffer.from("+OK Bye\r\n"));
			await p;
			expect(duplex.written[0]).toBe("QUIT\r\n");
		});
	});
});
