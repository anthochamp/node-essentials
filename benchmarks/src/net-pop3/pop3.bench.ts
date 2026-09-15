import { durationCase, durationCondition } from "@ac-bench/measure-duration";
import { hasBinary } from "@ac-kit/app-system";
import { Pop3Client } from "@ac-kit/net-pop3";
import { DuplexTransport } from "@ac-kit/net-transport-node";
import { spawnProcess, TcpSocket } from "@ac-kit/node";
import poplib from "poplib";

import { endpoints, NETWORK_OPTIONS } from "../__fixtures__/network.js";
import { SPAWN_BASELINES } from "../net-smtp/smtp.bench.js";

durationCondition(
	"POP3 session (connect → USER → PASS → STAT → QUIT)",
	{ ...NETWORK_OPTIONS, spawnBaselines: SPAWN_BASELINES },
	() => {
		durationCase("@ac-kit/.Pop3Client", { tags: { kind: "js" } }, async () => {
			const socket = TcpSocket.from();
			await socket.connect(endpoints.pop3Port, { host: endpoints.host });
			const client = new Pop3Client(new DuplexTransport(socket.stream));
			await client.wait("push");
			await client.user(endpoints.user);
			await client.pass(endpoints.password);
			await client.stat();
			await client.quit();
			client.destroy();
		});
		durationCase(
			"poplib",
			{ tags: { kind: "js" } },
			() =>
				new Promise<void>((resolve, reject) => {
					const Client = (
						poplib as { default: new (...args: never[]) => never }
					).default as unknown as new (
						port: number,
						host: string,
						options: unknown,
					) => {
						on: (event: string, handler: (...args: never[]) => void) => void;
						login: (user: string, password: string) => void;
						stat: () => void;
						quit: () => void;
					};
					const client = new Client(endpoints.pop3Port, endpoints.host, {
						tlserrs: false,
						enabletls: false,
						debug: false,
					});
					client.on("error", ((error: Error) => reject(error)) as never);
					client.on("connect", (() =>
						client.login(endpoints.user, endpoints.password)) as never);
					client.on("login", ((ok: boolean) =>
						ok ? client.stat() : reject(new Error("login failed"))) as never);
					client.on("stat", (() => client.quit()) as never);
					client.on("quit", (() => resolve()) as never);
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
					`pop3://${endpoints.host}:${endpoints.pop3Port}/`,
					"--user",
					`${endpoints.user}:${endpoints.password}`,
				]);
			},
		);
		durationCase(
			"python3 poplib",
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
						"import poplib",
						`c=poplib.POP3("${endpoints.host}",${endpoints.pop3Port})`,
						`c.user("${endpoints.user}")`,
						`c.pass_("${endpoints.password}")`,
						"c.stat()",
						"c.quit()",
					].join("\n"),
				]);
			},
		);
	},
);
