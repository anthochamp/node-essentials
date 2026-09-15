import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveFixtureDir } from "./paths.js";

describe("resolveFixtureDir", () => {
	let root: string;

	beforeEach(() => {
		root = join(tmpdir(), `fixture-util-test-${Date.now()}-${Math.random()}`);
		mkdirSync(root, { recursive: true });
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("returns the fixture directory when it has been fetched", () => {
		mkdirSync(join(root, "some-id"));

		expect(resolveFixtureDir("some-id", root, "@ac-kit/some-fixture")).toBe(
			join(root, "some-id"),
		);
	});

	it("throws when the fixture has not been fetched", () => {
		expect(() =>
			resolveFixtureDir("missing-id", root, "@ac-kit/some-fixture"),
		).toThrow(/setup/);
	});
});
