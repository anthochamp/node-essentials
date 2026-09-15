import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	durationCase,
	durationCondition,
	SpawnBaseline,
} from "@ac-bench/measure-duration";
import { hasBinary } from "@ac-kit/app-system";
import { SmtpClient } from "@ac-kit/net-smtp";
import { DuplexTransport } from "@ac-kit/net-transport-node";
import { spawnProcess, TcpSocket } from "@ac-kit/node";
import nodemailer from "nodemailer";

import { endpoints, NETWORK_OPTIONS } from "../__fixtures__/network.js";

export const SPAWN_BASELINES: SpawnBaseline[] = [
	{ name: "curl", command: "curl", args: ["--version"] },
	{ name: "python3", command: "python3", args: ["-c", "import smtplib"] },
];

const MESSAGE_BODY = [
	"From: bench@example.test",
	"To: bench@example.test",
	"Subject: benchmark",
	"",
	"x".repeat(2048),
].join("\r\n");

durationCondition(
	"SMTP session (connect → EHLO → MAIL → RCPT → DATA → QUIT)",
	{ ...NETWORK_OPTIONS, spawnBaselines: SPAWN_BASELINES },
	() => {
		durationCase("@ac-kit/.SmtpClient", { tags: { kind: "js" } }, async () => {
			const socket = TcpSocket.from();
			await socket.connect(endpoints.smtpPort, { host: endpoints.host });
			const client = new SmtpClient(new DuplexTransport(socket.stream));
			await client.wait("push");
			await client.ehlo("bench.example.test");
			await client.mailFrom(endpoints.mailbox);
			await client.rcptTo(endpoints.mailbox);
			await client.data(MESSAGE_BODY);
			await client.quit();
			client.destroy();
		});
		if (nodemailer) {
			durationCase("nodemailer", { tags: { kind: "js" } }, async () => {
				const transport = nodemailer.createTransport({
					host: endpoints.host,
					port: endpoints.smtpPort,
					secure: false,
					ignoreTLS: true,
				});
				await transport.sendMail({
					from: endpoints.mailbox,
					to: endpoints.mailbox,
					subject: "benchmark",
					text: "x".repeat(2048),
				});
				transport.close();
			});
		}
		let scratch = "";
		let messageFile = "";
		durationCase(
			"curl (C / libcurl)",
			{
				tags: { kind: "native" },
				setup: async () => {
					if (!(await hasBinary("curl"))) throw new Error("curl not on PATH");
					scratch = await mkdtemp(join(tmpdir(), "net-bench-"));
					messageFile = join(scratch, "message.eml");
					await writeFile(messageFile, MESSAGE_BODY, "utf8");
				},
				teardown: async () => {
					if (scratch) await rm(scratch, { recursive: true, force: true });
				},
			},
			async () => {
				await spawnProcess("curl", [
					"--silent",
					"--show-error",
					"--url",
					`smtp://${endpoints.host}:${endpoints.smtpPort}`,
					"--mail-from",
					endpoints.mailbox,
					"--mail-rcpt",
					endpoints.mailbox,
					"--upload-file",
					messageFile,
				]);
			},
		);
		durationCase(
			"python3 smtplib",
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
						"import smtplib,sys",
						`s=smtplib.SMTP("${endpoints.host}",${endpoints.smtpPort})`,
						"s.ehlo('bench.example.test')",
						`s.sendmail("${endpoints.mailbox}",["${endpoints.mailbox}"],sys.argv[1])`,
						"s.quit()",
					].join("\n"),
					MESSAGE_BODY,
				]);
			},
		);
	},
);
