import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContainerExec } from "./container-exec.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContainerExec", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("runs a command in a container", async () => {
		await dockerContainerExec("my-container", "sh");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container exec 'my-container' 'sh'",
			{ encoding: "utf8" },
		);
	});

	test("passes command arguments", async () => {
		await dockerContainerExec("my-container", "mariadb", {
			commandArgs: ["-u", "root", "mydb", "-e", "SELECT 1"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container exec 'my-container' 'mariadb' '-u' 'root' 'mydb' '-e' 'SELECT 1'",
			{ encoding: "utf8" },
		);
	});

	test("sets --env variables", async () => {
		await dockerContainerExec("my-container", "env", {
			env: { FOO: "bar", NUM: 42, FLAG: true, EMPTY: null },
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container exec --env 'FOO=bar' --env 'NUM=42' --env 'FLAG=1' --env 'EMPTY=' 'my-container' 'env'",
			{ encoding: "utf8" },
		);
	});

	test("leaves an --env value literal, quoting it only for the shell", async () => {
		// The value fills a whole argument, so dotenv quoting would land inside it.
		await dockerContainerExec("my-container", "env", {
			env: { JSON: '{"a": 1}' },
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			`docker container exec --env 'JSON={"a": 1}' 'my-container' 'env'`,
			{ encoding: "utf8" },
		);
	});

	test("sets --user", async () => {
		await dockerContainerExec("my-container", "whoami", { user: "nobody" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container exec --user 'nobody' 'my-container' 'whoami'",
			{ encoding: "utf8" },
		);
	});

	test("sets --workdir", async () => {
		await dockerContainerExec("my-container", "ls", { workdir: "/tmp" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container exec --workdir '/tmp' 'my-container' 'ls'",
			{ encoding: "utf8" },
		);
	});

	test("puts --context before the subcommand", async () => {
		await dockerContainerExec("my-container", "sh", { context: "remote" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' container exec 'my-container' 'sh'",
			{ encoding: "utf8" },
		);
	});

	test("returns stdout and stderr from execAsync", async () => {
		execAsyncMock.mockResolvedValue({ stdout: "hello\n", stderr: "warn\n" });

		const result = await dockerContainerExec("my-container", "sh");

		expect(result).toStrictEqual({ stdout: "hello\n", stderr: "warn\n" });
	});
});
