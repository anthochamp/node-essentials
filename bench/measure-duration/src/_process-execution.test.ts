import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessGroup } from "./_process-execution.js";

const NEVER_ = new AbortController().signal;

/** Spawns a grandchild, records its pid, then hangs. */
const HANGS_WITH_A_CHILD_ = `
const cp = require("node:child_process");
const fs = require("node:fs");
const child = cp.spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
	stdio: "ignore",
});
fs.writeFileSync(process.argv[1], String(child.pid));
setInterval(() => {}, 1000);
`;

describe("ProcessGroup", () => {
	let directory: string;

	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "bench-process-group-"));
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it("reports wall time and a zero exit for a program that succeeds", async () => {
		const group = new ProcessGroup();

		const outcome = await group.run(process.execPath, ["-e", ""], {}, NEVER_);
		await group.dispose();

		expect(outcome.exitCode).toBe(0);
		expect(outcome.terminatedBy).toBeNull();
		expect(outcome.wallMs).toBeGreaterThan(0);
	});

	it("captures the stderr tail of a program that fails", async () => {
		const group = new ProcessGroup();

		const outcome = await group.run(
			process.execPath,
			["-e", 'process.stderr.write("boom\\n"); process.exit(3);'],
			{},
			NEVER_,
		);
		await group.dispose();

		expect(outcome.exitCode).toBe(3);
		expect(outcome.stderrTail).toContain("boom");
	});

	it("reads the phase line a cooperating program writes to stdout", async () => {
		const group = new ProcessGroup();

		const outcome = await group.run(
			process.execPath,
			[
				"-e",
				'process.stdout.write(JSON.stringify({ startupMs: 1, importMs: 2, runMs: 3 }) + "\\n");',
			],
			{ capturePhases: true },
			NEVER_,
		);
		await group.dispose();

		expect(outcome.phases).toEqual({ startupMs: 1, importMs: 2, runMs: 3 });
	});

	it("ignores stdout that is not a phase line", async () => {
		const group = new ProcessGroup();

		const outcome = await group.run(
			process.execPath,
			["-e", 'process.stdout.write("just some output\\n");'],
			{ capturePhases: true },
			NEVER_,
		);
		await group.dispose();

		expect(outcome.phases).toBeNull();
	});

	// The whole reason for spawning detached: on POSIX a grandchild survives its
	// parent's death and is reparented to init, holding whatever it held, with
	// nothing left pointing at it.
	it("takes a hung process and everything it spawned down with it", async () => {
		const group = new ProcessGroup();
		const pidFile = join(directory, "descendant.pid");

		const running = group
			.run(process.execPath, ["-e", HANGS_WITH_A_CHILD_, pidFile], {}, NEVER_)
			.catch(() => null);

		const descendant = await readPid_(pidFile);
		expect(alive_(descendant)).toBe(true);

		await group.dispose();
		await running;

		// Polled, not immediate: the group is signalled as a whole, but each member
		// exits on its own schedule and a reparented one lingers as a zombie until
		// init reaps it.
		await vi.waitFor(() => expect(alive_(descendant)).toBe(false));
	});
});

/** @returns The pid the spawned program recorded, once it has recorded it. */
async function readPid_(pidFile: string): Promise<number> {
	for (let attempt = 0; attempt < 200; attempt++) {
		try {
			const recorded = Number.parseInt(await readFile(pidFile, "utf8"), 10);

			if (Number.isInteger(recorded)) {
				return recorded;
			}
		} catch {
			// Not written yet.
		}

		await new Promise((resolve) => setTimeout(resolve, 25));
	}

	throw new Error(`No pid was written to ${pidFile}`);
}

/** Signal 0 checks for existence without delivering anything. */
function alive_(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}
