import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hasBinary } from "@ac-kit/app-system";
import { ImapClient } from "@ac-kit/net-imap";
import { DuplexTransport } from "@ac-kit/net-transport-node";
import { spawnProcess, TcpSocket } from "@ac-kit/node";
import Imap from "node-imap";

import { endpoints, NETWORK_OPTIONS } from "../__fixtures__/network.js";
import { SPAWN_BASELINES } from "../net-smtp/smtp.bench.js";

durationCondition(
	"IMAP session (connect → LOGIN → SELECT → LOGOUT)",
	{ ...NETWORK_OPTIONS, spawnBaselines: SPAWN_BASELINES },
	() => {
		durationCase("@ac-kit/.ImapClient", { tags: { kind: "js" } }, async () => {
			const socket = TcpSocket.from();
			await socket.connect(endpoints.imapPort, { host: endpoints.host });
			const client = new ImapClient(new DuplexTransport(socket.stream));
			await client.wait("push");
			await client.login(endpoints.user, endpoints.password);
			await client.select("INBOX");
			await client.logout();
			client.destroy();
		});
		durationCase(
			"node-imap",
			{ tags: { kind: "js" } },
			() =>
				new Promise<void>((resolve, reject) => {
					const client = new Imap({
						user: endpoints.user,
						password: endpoints.password,
						host: endpoints.host,
						port: endpoints.imapPort,
						tls: false,
						autotls: "never",
					});
					client.once("error", ((error: Error) => reject(error)) as never);
					client.once("end", (() => resolve()) as never);
					client.once("ready", (() => {
						client.openBox("INBOX", true, (error) => {
							if (error) {
								reject(error);
								return;
							}
							client.end();
						});
					}) as never);
					client.connect();
				}),
		);

		durationCase(
			"curl (C / libcurl)",
			{
				tags: { kind: "native" },
				setup: async () => {
					if (!(await hasBinary("curl"))) throw new Error("curl not on PATH");
				},
			},
			async () => {
				await spawnProcess("curl", [
					"--silent",
					"--show-error",
					"--url",
					`imap://${endpoints.host}:${endpoints.imapPort}/INBOX`,
					"--user",
					`${endpoints.user}:${endpoints.password}`,
					"--request",
					"EXAMINE INBOX",
				]);
			},
		);
		durationCase(
			"python3 imaplib",
			{
				tags: { kind: "native" },
				setup: async () => {
					if (!(await hasBinary("python3")))
						throw new Error("python3 not on PATH");
				},
			},
			async () => {
				await spawnProcess("python3", [
					"-c",
					[
						"import imaplib",
						`c=imaplib.IMAP4("${endpoints.host}",${endpoints.imapPort})`,
						`c.login("${endpoints.user}","${endpoints.password}")`,
						'c.select("INBOX")',
						"c.logout()",
					].join("\n"),
				]);
			},
		);
	},
);
