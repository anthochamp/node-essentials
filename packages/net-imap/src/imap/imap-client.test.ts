import { Duplex } from "node:stream";

import { DuplexTransport } from "@ac-kit/net-transport-node";
import { expect, suite, test } from "vitest";

import { ImapClient, ImapProtocolError } from "./imap-client.js";

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

function makeClient(): { duplex: FakeDuplex; client: ImapClient } {
	const duplex = new FakeDuplex();
	const client = new ImapClient(new DuplexTransport(duplex));
	return { duplex, client };
}

suite("ImapClient", () => {
	suite("push event", () => {
		test("dispatches the greeting as a push event", async () => {
			const duplex = new FakeDuplex();
			const client = new ImapClient(new DuplexTransport(duplex));
			const pushPromise = client.wait("push");
			duplex.push(Buffer.from("* OK Dovecot ready\r\n"));
			const [greeting] = await pushPromise;
			expect(greeting).toBe("* OK Dovecot ready");
		});
	});

	suite("command", () => {
		test("sends TAG CMD with CRLF", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("X001", "NOOP");
			duplex.push(Buffer.from("X001 OK\r\n"));
			await p;
			expect(duplex.written[0]).toBe("X001 NOOP\r\n");
		});

		test("returns OK status and text", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("X001", "NOOP");
			duplex.push(Buffer.from("X001 OK NOOP completed\r\n"));
			const response = await p;
			expect(response.status).toBe("OK");
			expect(response.text).toBe("NOOP completed");
			expect(response.untagged).toStrictEqual([]);
		});

		test("collects untagged lines before the tagged response", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("A0001", "CAPABILITY");
			duplex.push(
				Buffer.from(
					"* CAPABILITY IMAP4rev1 STARTTLS\r\nA0001 OK CAPABILITY completed\r\n",
				),
			);
			const response = await p;
			expect(response.status).toBe("OK");
			expect(response.untagged).toStrictEqual([
				"* CAPABILITY IMAP4rev1 STARTTLS",
			]);
		});

		test("returns NO status", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("A0001", "LOGIN bad bad");
			duplex.push(Buffer.from("A0001 NO Login failed\r\n"));
			const response = await p;
			expect(response.status).toBe("NO");
		});

		test("throws ImapProtocolError for an unrecognised tagged status", async () => {
			const { duplex, client } = makeClient();
			const p = client.command("A0001", "NOOP");
			duplex.push(Buffer.from("A0001 WEIRD response\r\n"));
			await expect(p).rejects.toBeInstanceOf(ImapProtocolError);
		});
	});

	suite("login", () => {
		test("sends LOGIN with quoted credentials and auto-generates a tag", async () => {
			const { duplex, client } = makeClient();
			const p = client.login("alice@example.com", "alice123");
			duplex.push(Buffer.from("A0001 OK LOGIN completed\r\n"));
			await p;
			expect(duplex.written[0]).toBe(
				'A0001 LOGIN "alice@example.com" "alice123"\r\n',
			);
		});
	});

	suite("select", () => {
		test("sends SELECT and returns EXISTS count in untagged lines", async () => {
			const { duplex, client } = makeClient();
			const p = client.select("INBOX");
			duplex.push(
				Buffer.from(
					"* 3 EXISTS\r\n* 0 RECENT\r\nA0001 OK [READ-WRITE] SELECT\r\n",
				),
			);
			const response = await p;
			expect(duplex.written[0]).toBe('A0001 SELECT "INBOX"\r\n');
			expect(response.status).toBe("OK");
			expect(response.untagged).toContain("* 3 EXISTS");
		});
	});

	suite("logout", () => {
		test("sends LOGOUT and returns OK response", async () => {
			const { duplex, client } = makeClient();
			const p = client.logout();
			duplex.push(
				Buffer.from("* BYE Logging out\r\nA0001 OK Logout completed\r\n"),
			);
			const response = await p;
			expect(duplex.written[0]).toBe("A0001 LOGOUT\r\n");
			expect(response.status).toBe("OK");
		});
	});

	suite("nextTag", () => {
		test("generates sequenced tags", () => {
			const { client } = makeClient();
			expect(client.nextTag()).toBe("A0001");
			expect(client.nextTag()).toBe("A0002");
			expect(client.nextTag()).toBe("A0003");
		});
	});
});
