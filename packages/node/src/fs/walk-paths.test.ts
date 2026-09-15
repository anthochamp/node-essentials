import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type WalkPathsOptions, walkPaths } from "./walk-paths.js";

describe("walkPaths", () => {
	let root: string;

	const collect = (options?: Omit<WalkPathsOptions, "root">) =>
		Array.fromAsync(walkPaths({ root, ...options }), (walked) => walked.path);

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), "walkPaths-"));

		await mkdir(join(root, "src", "nested"), { recursive: true });
		await mkdir(join(root, "node_modules"));
		await mkdir(join(root, "shared"));
		await mkdir(join(root, "loop"));

		await writeFile(join(root, "a.txt"), "");
		await writeFile(join(root, "b.ts"), "");
		await writeFile(join(root, ".hidden"), "");
		await writeFile(join(root, "src", "c.ts"), "");
		await writeFile(join(root, "src", "nested", "d.ts"), "");
		await writeFile(join(root, "node_modules", "junk.ts"), "");
		await writeFile(join(root, "shared", "x.txt"), "");

		await symlink(join(root, "shared"), join(root, "p"));
		await symlink(join(root, "shared"), join(root, "q"));
		await symlink(join(root, "loop"), join(root, "loop", "self"));
		await symlink(join(root, "missing"), join(root, "broken"));
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("should yield every entry of the root, sorted, when nothing is included", async () => {
		await expect(collect()).resolves.toEqual([
			".hidden",
			"a.txt",
			"b.ts",
			"broken",
			"loop",
			"node_modules",
			"p",
			"q",
			"shared",
			"src",
		]);
	});

	it("should stay flat for a glob without a globstar", async () => {
		await expect(collect({ include: "*.ts" })).resolves.toEqual(["b.ts"]);
	});

	it("should recurse for a glob with a globstar", async () => {
		await expect(
			collect({ include: "**/*.ts", exclude: "node_modules" }),
		).resolves.toEqual(["b.ts", "src/c.ts", "src/nested/d.ts"]);
	});

	it("should stay flat for a regular expression", async () => {
		await expect(collect({ include: /\.ts$/ })).resolves.toEqual(["b.ts"]);
	});

	it("should recurse a regular expression when descend says so", async () => {
		await expect(
			collect({
				include: /\.ts$/,
				exclude: "node_modules",
				descend: true,
			}),
		).resolves.toEqual(["b.ts", "src/c.ts", "src/nested/d.ts"]);
	});

	it("should let an explicit descend override the globstar default", async () => {
		await expect(
			collect({ include: "**/*.ts", descend: false }),
		).resolves.toEqual(["b.ts"]);
	});

	it("should never descend into an excluded directory", async () => {
		await expect(
			collect({ include: "**/*.ts", exclude: "src" }),
		).resolves.toEqual(["b.ts", "node_modules/junk.ts"]);
	});

	it("should yield a path once however many patterns match it", async () => {
		await expect(
			collect({ include: ["*.ts", /^b\./, (_entry, path) => path === "b.ts"] }),
		).resolves.toEqual(["b.ts"]);
	});

	it("should pass the directory entry to a predicate", async () => {
		const isDirectory = vi.fn((entry) => entry.isDirectory());

		await expect(collect({ include: isDirectory })).resolves.toEqual([
			"loop",
			"node_modules",
			"shared",
			"src",
		]);
		expect(isDirectory).toHaveBeenCalledTimes(10);
	});

	it("should cap the depth", async () => {
		await expect(
			collect({ include: "**/*.ts", exclude: "node_modules", maxDepth: 2 }),
		).resolves.toEqual(["b.ts", "src/c.ts"]);
	});

	it("should stop reading when the consumer breaks out", async () => {
		const seen: string[] = [];
		for await (const { path } of walkPaths({ root, include: "**/*.ts" })) {
			seen.push(path);
			break;
		}

		expect(seen).toEqual(["b.ts"]);
	});

	it("should abort on a signalled walk", async () => {
		await expect(collect({ signal: AbortSignal.abort() })).rejects.toThrow();
	});

	describe("symbolic links", () => {
		it("should not descend into a link by default", async () => {
			await expect(collect({ include: "p/**" })).resolves.toEqual([]);
		});

		it("should descend into a link when asked", async () => {
			await expect(
				collect({ include: "p/**", followSymlinks: true }),
			).resolves.toEqual(["p/x.txt"]);
		});

		it("should follow two links to one directory, which is not a cycle", async () => {
			await expect(
				collect({ include: "**/x.txt", followSymlinks: true }),
			).resolves.toEqual(["p/x.txt", "q/x.txt", "shared/x.txt"]);
		});

		it("should refuse to descend a link resolving to an ancestor", async () => {
			await expect(
				collect({ include: "loop/**", followSymlinks: true }),
			).resolves.toEqual(["loop/self"]);
		});

		it("should skip a broken link", async () => {
			await expect(
				collect({ include: "broken/**", followSymlinks: true }),
			).resolves.toEqual([]);
		});
	});

	describe("unreadable directories", () => {
		const missing = () => join(root, "does-not-exist");

		it("should throw on a missing root by default", async () => {
			await expect(
				Array.fromAsync(walkPaths({ root: missing() })),
			).rejects.toThrow();
		});

		it("should throw on a missing root when told to throw", async () => {
			await expect(
				Array.fromAsync(walkPaths({ root: missing(), unreadable: "throw" })),
			).rejects.toThrow();
		});

		it("should yield nothing for a missing root when told to skip", async () => {
			await expect(
				Array.fromAsync(walkPaths({ root: missing(), unreadable: "skip" })),
			).resolves.toEqual([]);
		});
	});
});
