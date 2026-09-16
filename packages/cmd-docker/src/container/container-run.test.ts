import { execAsync } from "@ac-kit/node";
import { beforeEach, expect, suite, test, vi } from "vitest";

import { dockerContainerRun } from "./container-run.js";

vi.mock(import("@ac-kit/node"), async (importActual) => {
	const actual = await importActual();
	return {
		...actual,
		execAsync: vi.fn(),
	};
});

const execAsyncMock = vi.mocked(execAsync);

suite("dockerContainerRun", () => {
	beforeEach(() => {
		execAsyncMock.mockReset();
		execAsyncMock.mockResolvedValue({ stdout: "", stderr: "" });
	});

	test("runs a container with just an image", async () => {
		await dockerContainerRun("my-image");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("passes a command and its arguments", async () => {
		await dockerContainerRun("my-image", {
			command: "sh",
			commandArgs: ["-c", "echo hi"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run 'my-image' 'sh' '-c' 'echo hi'",
			{ encoding: "utf8" },
		);
	});

	test("ignores command arguments with no command to attach them to", async () => {
		await dockerContainerRun("my-image", { commandArgs: ["-c", "echo hi"] });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets --rm", async () => {
		await dockerContainerRun("my-image", { rm: true });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --rm 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets --detach", async () => {
		await dockerContainerRun("my-image", { detach: true });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --detach 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets --name", async () => {
		await dockerContainerRun("my-image", { name: "my-container" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --name 'my-container' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets --network", async () => {
		await dockerContainerRun("my-image", { network: "my-net" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --network 'my-net' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets multiple --add-host entries", async () => {
		await dockerContainerRun("my-image", {
			addHost: ["host.docker.internal:host-gateway", "foo:1.2.3.4"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --add-host 'host.docker.internal:host-gateway' --add-host 'foo:1.2.3.4' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets --env variables", async () => {
		await dockerContainerRun("my-image", {
			env: { FOO: "bar", NUM: 42 },
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --env 'FOO=bar' --env 'NUM=42' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets multiple --publish entries", async () => {
		await dockerContainerRun("my-image", {
			publish: ["8080:80", "9090:90"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --publish '8080:80' --publish '9090:90' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("sets multiple --volume entries", async () => {
		await dockerContainerRun("my-image", {
			volume: ["/host/path:/container/path:ro", "/data:/data"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --volume '/host/path:/container/path:ro' --volume '/data:/data' 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("puts --context before the subcommand", async () => {
		await dockerContainerRun("my-image", { context: "remote" });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' container run 'my-image'",
			{ encoding: "utf8" },
		);
	});

	test("combines all options in correct flag order", async () => {
		await dockerContainerRun("my-image", {
			context: "remote",
			rm: true,
			detach: true,
			name: "c1",
			network: "net1",
			addHost: ["host.docker.internal:host-gateway"],
			env: { KEY: "val" },
			publish: ["8080:80"],
			volume: ["/a:/b:ro"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker --context 'remote' container run --rm --detach --name 'c1' --network 'net1' --add-host 'host.docker.internal:host-gateway' --env 'KEY=val' --publish '8080:80' --volume '/a:/b:ro' 'my-image'",
			{ encoding: "utf8" },
		);
	});
});
