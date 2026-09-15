import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { execFileAsync } from "@ac-kit/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { gitCheckout } from "./checkout.js";
import { gitFetch } from "./fetch.js";
import { gitInit } from "./init.js";
import { gitRemoteAdd } from "./remote.js";
import { gitRevParse } from "./rev-parse.js";
import {
	gitSparseCheckoutInit,
	gitSparseCheckoutSet,
} from "./sparse-checkout.js";

// A local, filesystem-path "origin" — exercises the same fetch/sparse-checkout
// pipeline `@ac-kit/fixture-x509` uses against GitHub, with no network access.

describe("git command wrappers", () => {
	let root: string;
	let originDir: string;
	let workDir: string;
	let commitSha: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "tool-git-test-"));
		originDir = join(root, "origin");
		workDir = join(root, "work");

		await mkdir(join(originDir, "keep"), { recursive: true });
		await mkdir(join(originDir, "skip"), { recursive: true });
		await writeFile(join(originDir, "keep", "file.txt"), "kept\n");
		await writeFile(join(originDir, "skip", "file.txt"), "skipped\n");

		await execFileAsync("git", ["init", "--quiet", originDir]);
		await execFileAsync("git", ["config", "user.email", "test@example.com"], {
			cwd: originDir,
		});
		await execFileAsync("git", ["config", "user.name", "Test"], {
			cwd: originDir,
		});
		await execFileAsync("git", ["add", "-A"], { cwd: originDir });
		await execFileAsync("git", ["commit", "--quiet", "-m", "initial commit"], {
			cwd: originDir,
		});

		const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
			cwd: originDir,
			encoding: "utf8",
		});
		commitSha = stdout.trim();
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("fetches a pinned commit and sparse-checks out only the requested paths", async () => {
		await mkdir(workDir, { recursive: true });
		const execOptions = { cwd: workDir };
		await gitInit({ execOptions });
		await gitRemoteAdd("origin", originDir, { execOptions });
		await gitFetch("origin", commitSha, {
			filter: "blob:none",
			depth: 1,
			execOptions,
		});
		await gitSparseCheckoutInit({ cone: true, execOptions });
		await gitSparseCheckoutSet(["keep"], { execOptions });
		await gitCheckout(commitSha, { execOptions });

		expect(existsSync(join(workDir, "keep", "file.txt"))).toBe(true);
		expect(existsSync(join(workDir, "skip", "file.txt"))).toBe(false);

		const resolved = await gitRevParse("HEAD", { execOptions });
		expect(resolved).toBe(commitSha);
	});

	it("gitRevParse rejects when the revision cannot be resolved", async () => {
		await mkdir(workDir, { recursive: true });
		const execOptions = { cwd: workDir };
		await gitInit({ execOptions });

		await expect(
			gitRevParse("not-a-real-ref", { execOptions }),
		).rejects.toThrow();
	});
});
