import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTempDir } from "./create-temp-dir.js";
import { PathEscapeError } from "./path-escape-error.js";
import {
	assertPathWithin,
	assertPathWithinAsync,
	isPathWithin,
	isPathWithinAsync,
} from "./path-within.js";

const isWin32 = sep === "\\";

describe("isPathWithin", () => {
	it("should accept a path below the root", () => {
		expect(isPathWithin("/var/data", "/var/data/a/b")).toBe(true);
	});

	it("should reject a sibling sharing the root's string prefix", () => {
		expect(isPathWithin("/var/data", "/var/data-evil")).toBe(false);
		expect(isPathWithin("/var/data", "/var/data-evil/x")).toBe(false);
	});

	it("should reject a traversal out of the root", () => {
		expect(isPathWithin("/var/data", "/var/data/../../../etc/passwd")).toBe(
			false,
		);
		expect(isPathWithin("/var/data", "/var/data/a/../../etc/passwd")).toBe(
			false,
		);
	});

	it("should accept a traversal that stays inside", () => {
		expect(isPathWithin("/var/data", "/var/data/a/../b")).toBe(true);
	});

	it("should ignore a trailing separator on either side", () => {
		expect(isPathWithin("/var/data/", "/var/data/a/")).toBe(true);
		expect(isPathWithin("/var/data/", "/var/data/")).toBe(true);
	});

	it("should treat the root itself as within by default", () => {
		expect(isPathWithin("/var/data", "/var/data")).toBe(true);
		expect(isPathWithin("/var/data", "/var/data/.")).toBe(true);
	});

	it("should exclude the root when allowRoot is false", () => {
		expect(isPathWithin("/var/data", "/var/data", { allowRoot: false })).toBe(
			false,
		);
		expect(isPathWithin("/var/data", "/var/data/a", { allowRoot: false })).toBe(
			true,
		);
	});

	it("should reject an ancestor of the root", () => {
		expect(isPathWithin("/var/data", "/var")).toBe(false);
		expect(isPathWithin("/var/data", "/")).toBe(false);
	});

	it("should resolve relative inputs against `from`", () => {
		expect(isPathWithin("data", "data/a/b", { from: "/var" })).toBe(true);
		expect(isPathWithin("data", "../etc/passwd", { from: "/var" })).toBe(false);
		expect(isPathWithin("/var/data", "a/b", { from: "/var/data" })).toBe(true);
	});

	it("should compare case-sensitively when asked", () => {
		expect(
			isPathWithin("/var/data", "/VAR/DATA/a", { caseInsensitive: false }),
		).toBe(false);
		expect(
			isPathWithin("/var/data", "/VAR/DATA/a", { caseInsensitive: true }),
		).toBe(true);
	});

	it.runIf(isWin32)("should handle a Windows drive and separators", () => {
		expect(isPathWithin("C:\\var\\data", "C:/var/data/a")).toBe(true);
		expect(isPathWithin("C:\\var\\data", "C:\\var\\data-evil")).toBe(false);
		expect(isPathWithin("C:\\var\\data", "D:\\var\\data\\a")).toBe(false);
	});
});

describe("assertPathWithin", () => {
	it("should return the resolved path", () => {
		expect(assertPathWithin("/var/data", "/var/data/a/../b")).toBe(
			resolve("/var/data/b"),
		);
	});

	it("should throw a PathEscapeError naming the offending path", () => {
		let thrown: unknown;
		try {
			assertPathWithin("/var/data", "/var/data/../etc/passwd");
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(PathEscapeError);
		expect((thrown as PathEscapeError).path).toContain("passwd");
		expect((thrown as PathEscapeError).message).toContain("passwd");
	});
});

describe("symlink-aware containment", () => {
	let base: string;
	let root: string;
	let outside: string;

	beforeAll(async () => {
		base = await createTempDir("path-within");
		root = join(base, "root");
		outside = join(base, "outside");

		await mkdir(join(root, "inner"), { recursive: true });
		await mkdir(outside, { recursive: true });
		await writeFile(join(outside, "secret.txt"), "secret");
		await writeFile(join(root, "own.txt"), "own");

		await symlink(join(outside, "secret.txt"), join(root, "escape.txt"));
		await symlink(outside, join(root, "escape-dir"));
		await symlink(join(root, "own.txt"), join(root, "inner", "stay.txt"));
	});

	afterAll(async () => {
		await rm(base, { recursive: true, force: true });
	});

	it("should accept a symlink escape textually", () => {
		expect(isPathWithin(root, join(root, "escape.txt"))).toBe(true);
	});

	it("should reject a symlink escape once resolved", async () => {
		await expect(
			isPathWithinAsync(root, join(root, "escape.txt")),
		).resolves.toBe(false);
	});

	it("should reject a path under a symlinked directory that leaves the root", async () => {
		await expect(
			isPathWithinAsync(root, join(root, "escape-dir", "secret.txt")),
		).resolves.toBe(false);
	});

	it("should accept a symlink that stays inside the root", async () => {
		await expect(
			isPathWithinAsync(root, join(root, "inner", "stay.txt")),
		).resolves.toBe(true);
	});

	it("should accept a path that does not exist yet", async () => {
		await expect(
			isPathWithinAsync(root, join(root, "inner", "new", "file.txt")),
		).resolves.toBe(true);
	});

	it("should reject a missing path whose existing ancestor escapes", async () => {
		await expect(
			isPathWithinAsync(root, join(root, "escape-dir", "new.txt")),
		).resolves.toBe(false);
	});

	it("should throw for a resolved escape and return the real path otherwise", async () => {
		await expect(
			assertPathWithinAsync(root, join(root, "escape.txt")),
		).rejects.toBeInstanceOf(PathEscapeError);

		await expect(
			assertPathWithinAsync(root, join(root, "own.txt")),
		).resolves.toContain("own.txt");
	});
});
