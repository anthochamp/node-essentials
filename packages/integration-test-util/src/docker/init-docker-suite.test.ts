import {
	dockerBuildxBuild,
	dockerContainerRm,
	dockerContainerRun,
	dockerImageRm,
} from "@ac-kit/cmd-docker";
import { getRandomBytes } from "@ac-kit/crypto-random";
import { expect, suite, test, vi } from "vitest";

import { initDockerSuite } from "./init-docker-suite.js";

const hooks = {
	beforeAll: [] as Array<() => void | Promise<void>>,
	afterAll: [] as Array<() => void | Promise<void>>,
	beforeEach: [] as Array<() => void | Promise<void>>,
	afterEach: [] as Array<() => void | Promise<void>>,
};

// All four hooks are captured rather than registered, so a test can drive the
// suite lifecycle step by step. That leaves this file without a working
// `beforeEach` of its own, hence the explicit `resetAll()` in every test.
vi.mock("vitest", async (importActual) => {
	const actual = await importActual<typeof import("vitest")>();

	return {
		...actual,
		beforeAll: vi.fn((hook: () => void | Promise<void>): void => {
			hooks.beforeAll.push(hook);
		}),
		afterAll: vi.fn((hook: () => void | Promise<void>): void => {
			hooks.afterAll.push(hook);
		}),
		beforeEach: vi.fn((hook: () => void | Promise<void>): void => {
			hooks.beforeEach.push(hook);
		}),
		afterEach: vi.fn((hook: () => void | Promise<void>): void => {
			hooks.afterEach.push(hook);
		}),
	};
});

vi.mock(import("@ac-kit/cmd-docker"), () => ({
	dockerBuildxBuild: vi.fn(),
	dockerContainerRm: vi.fn(),
	dockerContainerRun: vi.fn(),
	dockerImageRm: vi.fn(),
}));

vi.mock(import("@ac-kit/crypto-random"), () => ({
	getRandomBytes: vi.fn(),
}));

const dockerBuildxBuildMock = vi.mocked(dockerBuildxBuild);
const dockerContainerRmMock = vi.mocked(dockerContainerRm);
const dockerContainerRunMock = vi.mocked(dockerContainerRun);
const dockerImageRmMock = vi.mocked(dockerImageRm);
const getRandomBytesMock = vi.mocked(getRandomBytes);

/** The names `initDockerSuite` derives from the two mocked random draws. */
const SUITE_ID = "abababababababab";
const IMAGE = `test-${SUITE_ID}-img`;
const CONTAINER = `test-${SUITE_ID}-cdcdcdcd`;

function resetAll(): void {
	hooks.beforeAll = [];
	hooks.afterAll = [];
	hooks.beforeEach = [];
	hooks.afterEach = [];

	for (const mock of [
		dockerBuildxBuildMock,
		dockerContainerRmMock,
		dockerContainerRunMock,
		dockerImageRmMock,
		getRandomBytesMock,
	]) {
		mock.mockReset();
	}

	getRandomBytesMock.mockImplementation((byteLength: number) =>
		new Uint8Array(byteLength).fill(byteLength === 8 ? 0xab : 0xcd),
	);
}

async function runHooks(hookList: Array<() => void | Promise<void>>) {
	for (const hook of hookList) {
		await hook();
	}
}

suite("initDockerSuite", () => {
	test("builds the image under a name unique to the suite", async () => {
		resetAll();
		const context = initDockerSuite("/tmp/src");

		expect(context.containerImageName).toBe(IMAGE);

		await runHooks(hooks.beforeAll);

		expect(dockerBuildxBuildMock).toHaveBeenCalledWith("/tmp/src", {
			context: undefined,
			tags: [IMAGE],
		});
	});

	test("gives two suites different names", () => {
		resetAll();
		getRandomBytesMock.mockImplementationOnce(() =>
			new Uint8Array(8).fill(0x11),
		);
		const first = initDockerSuite("/tmp/src");

		getRandomBytesMock.mockImplementationOnce(() =>
			new Uint8Array(8).fill(0x22),
		);
		const second = initDockerSuite("/tmp/src");

		expect(first.containerImageName).not.toBe(second.containerImageName);
	});

	test("runs a detached container per test and removes it afterwards", async () => {
		resetAll();
		initDockerSuite("/tmp/src");

		await runHooks(hooks.beforeEach);

		expect(dockerContainerRunMock).toHaveBeenCalledWith(IMAGE, {
			context: undefined,
			name: CONTAINER,
			detach: true,
		});

		await runHooks(hooks.afterEach);

		expect(dockerContainerRmMock).toHaveBeenCalledWith([CONTAINER], {
			context: undefined,
			force: true,
		});
	});

	test("keeps the container between tests when reuse is asked for", async () => {
		resetAll();
		initDockerSuite("/tmp/src", { reuseContainerInstance: true });

		await runHooks(hooks.beforeEach);
		await runHooks(hooks.afterEach);
		await runHooks(hooks.beforeEach);

		expect(dockerContainerRunMock).toHaveBeenCalledTimes(1);
		expect(dockerContainerRmMock).not.toHaveBeenCalled();
	});

	test("removes the reused container once the suite ends", async () => {
		resetAll();
		initDockerSuite("/tmp/src", { reuseContainerInstance: true });

		await runHooks(hooks.beforeAll);
		await runHooks(hooks.beforeEach);
		await runHooks(hooks.afterAll);

		expect(dockerContainerRmMock).toHaveBeenCalledWith([CONTAINER], {
			context: undefined,
			force: true,
		});
		expect(dockerImageRmMock).toHaveBeenCalledWith([IMAGE], {
			context: undefined,
			force: true,
		});
	});

	test("passes the suite context to every command instead of switching it", async () => {
		resetAll();
		initDockerSuite("/tmp/src", { context: "remote" });

		await runHooks(hooks.beforeAll);
		await runHooks(hooks.beforeEach);
		await runHooks(hooks.afterEach);
		await runHooks(hooks.afterAll);

		expect(dockerBuildxBuildMock).toHaveBeenCalledWith("/tmp/src", {
			context: "remote",
			tags: [IMAGE],
		});
		expect(dockerContainerRunMock).toHaveBeenCalledWith(
			IMAGE,
			expect.objectContaining({ context: "remote" }),
		);
		expect(dockerContainerRmMock).toHaveBeenCalledWith(
			[CONTAINER],
			expect.objectContaining({ context: "remote" }),
		);
		expect(dockerImageRmMock).toHaveBeenCalledWith(
			[IMAGE],
			expect.objectContaining({ context: "remote" }),
		);
	});

	test("fires the lifecycle hooks around each start and stop", async () => {
		resetAll();
		const calls: string[] = [];
		initDockerSuite("/tmp/src", {
			onContainerStarting: (name) => {
				calls.push(`starting:${name}`);
			},
			onContainerStarted: (name) => {
				calls.push(`started:${name}`);
			},
			onContainerStopping: (name) => {
				calls.push(`stopping:${name}`);
			},
			onContainerStopped: (name) => {
				calls.push(`stopped:${name}`);
			},
		});

		dockerContainerRunMock.mockImplementation(async () => {
			calls.push("run");
		});
		dockerContainerRmMock.mockImplementation(async () => {
			calls.push("rm");
		});

		await runHooks(hooks.beforeEach);
		await runHooks(hooks.afterEach);

		expect(calls).toStrictEqual([
			`starting:${CONTAINER}`,
			"run",
			`started:${CONTAINER}`,
			`stopping:${CONTAINER}`,
			"rm",
			`stopped:${CONTAINER}`,
		]);
	});

	test("lets the caller add run options without owning the reserved ones", async () => {
		resetAll();
		initDockerSuite("/tmp/src", {
			context: "remote",
			containerRunOptions: (name) => ({ publish: [`8080:80`], network: name }),
		});

		await runHooks(hooks.beforeEach);

		expect(dockerContainerRunMock).toHaveBeenCalledWith(IMAGE, {
			publish: ["8080:80"],
			network: CONTAINER,
			context: "remote",
			name: CONTAINER,
			detach: true,
		});
	});

	test("removes the image even when a container refuses to go", async () => {
		resetAll();
		const removalFailure = new Error("container busy");
		dockerContainerRmMock.mockRejectedValue(removalFailure);

		initDockerSuite("/tmp/src");

		await runHooks(hooks.beforeAll);
		await runHooks(hooks.beforeEach);

		await expect(runHooks(hooks.afterAll)).rejects.toBe(removalFailure);

		expect(dockerImageRmMock).toHaveBeenCalledWith([IMAGE], {
			context: undefined,
			force: true,
		});
	});

	test("reports every cleanup failure, not just the first", async () => {
		resetAll();
		dockerContainerRmMock.mockRejectedValue(new Error("container busy"));
		dockerImageRmMock.mockRejectedValue(new Error("image in use"));

		initDockerSuite("/tmp/src");

		await runHooks(hooks.beforeAll);
		await runHooks(hooks.beforeEach);

		await expect(runHooks(hooks.afterAll)).rejects.toThrow(AggregateError);
	});

	test("removes the image when the build itself failed", async () => {
		resetAll();
		dockerBuildxBuildMock.mockRejectedValue(new Error("build failed"));

		initDockerSuite("/tmp/src");

		// A build that tags the image and then fails still leaves one behind.
		await expect(runHooks(hooks.beforeAll)).rejects.toThrow("build failed");
		await runHooks(hooks.afterAll);

		expect(dockerImageRmMock).toHaveBeenCalledWith([IMAGE], {
			context: undefined,
			force: true,
		});
	});

	test("does not remove an image it never tried to build", async () => {
		resetAll();
		initDockerSuite("/tmp/src");

		await runHooks(hooks.afterAll);

		expect(dockerImageRmMock).not.toHaveBeenCalled();
	});

	test("still removes a container whose started hook threw", async () => {
		resetAll();
		initDockerSuite("/tmp/src", {
			onContainerStarted: () => {
				throw new Error("not ready");
			},
		});

		await expect(runHooks(hooks.beforeEach)).rejects.toThrow("not ready");
		await runHooks(hooks.afterEach);

		expect(dockerContainerRmMock).toHaveBeenCalledWith([CONTAINER], {
			context: undefined,
			force: true,
		});
	});

	test("honours a custom name prefix", () => {
		resetAll();
		const context = initDockerSuite("/tmp/src", {
			containerNamePrefix: "smtp-",
		});

		expect(context.containerImageName).toBe(`smtp-${SUITE_ID}-img`);
	});
});
