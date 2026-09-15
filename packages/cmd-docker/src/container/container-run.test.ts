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
	});

	test("runs a container with just an image", async () => {
		await dockerContainerRun("my-image");

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run 'my-image'",
		);
	});

	test("passes a command and its arguments", async () => {
		await dockerContainerRun("my-image", "sh", ["-c", "echo hi"]);

		expect(execAsyncMock).toHaveBeenCalledTimes(1);
		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run 'my-image' 'sh' '-c' 'echo hi'",
		);
	});

	test("sets --rm", async () => {
		await dockerContainerRun("my-image", undefined, undefined, { rm: true });

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --rm 'my-image'",
		);
	});

	test("sets --detach", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			detach: true,
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --detach 'my-image'",
		);
	});

	test("sets --name", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			name: "my-container",
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --name 'my-container' 'my-image'",
		);
	});

	test("sets --network", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			network: "my-net",
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --network 'my-net' 'my-image'",
		);
	});

	test("sets multiple --add-host entries", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			addHost: ["host.docker.internal:host-gateway", "foo:1.2.3.4"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --add-host 'host.docker.internal:host-gateway' --add-host 'foo:1.2.3.4' 'my-image'",
		);
	});

	test("sets --env variables", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			env: { FOO: "bar", NUM: 42 },
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --env 'FOO=bar' --env 'NUM=42' 'my-image'",
		);
	});

	test("sets multiple --publish entries", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			publish: ["8080:80", "9090:90"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --publish '8080:80' --publish '9090:90' 'my-image'",
		);
	});

	test("sets multiple --volume entries", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
			volume: ["/host/path:/container/path:ro", "/data:/data"],
		});

		expect(execAsyncMock).toHaveBeenCalledWith(
			"docker container run --volume '/host/path:/container/path:ro' --volume '/data:/data' 'my-image'",
		);
	});

	test("combines all options in correct flag order", async () => {
		await dockerContainerRun("my-image", undefined, undefined, {
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
			"docker container run --rm --detach --name 'c1' --network 'net1' --add-host 'host.docker.internal:host-gateway' --env 'KEY=val' --publish '8080:80' --volume '/a:/b:ro' 'my-image'",
		);
	});
});
