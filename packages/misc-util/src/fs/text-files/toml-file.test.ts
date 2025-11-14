/** biome-ignore-all lint/suspicious/noExplicitAny: fixture */

import { mkdtempSync, rmdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, expect, suite, test } from "vitest";
import { readTomlFile, writeTomlFile } from "./toml-file.js";

suite("readTomlFile", () => {
	const fixturePath = path.join(__dirname, "__fixtures__", "example.toml");

	test("should parse a valid TOML file", async () => {
		const result = await readTomlFile(fixturePath);
		expect(result).toHaveProperty("database");
		const db = (result as any).database;
		expect(db.server).toBe("192.168.1.1");
		expect(db.enabled).toBe(true);
		const servers = (result as any).servers;
		expect(servers.alpha.ip).toBe("10.0.0.1");
		const clients = (result as any).clients;
		expect(clients.hosts).toEqual(["alpha", "omega"]);
	});

	test("should throw on invalid TOML", async () => {
		await expect(readTomlFile(`${fixturePath}invalid`)).rejects.toThrow();
	});
});

suite("writeTomlFile", () => {
	let tempDir: string;
	let tempPath: string;

	beforeEach(() => {
		tempDir = mkdtempSync("toml-test-");
		tempPath = path.join(tempDir, "temp.toml");
	});

	afterEach(() => {
		try {
			unlinkSync(tempPath);
		} catch {}
		try {
			rmdirSync(tempDir);
		} catch {}
	});

	test("should write and read TOML file correctly", async () => {
		const data = {
			foo: "bar",
			arr: [1, 2, 3],
			nested: { a: true },
		};
		await writeTomlFile(tempPath, data);
		const readBack = await readTomlFile(tempPath);
		expect((readBack as any).foo).toBe("bar");
		expect((readBack as any).arr).toEqual([1, 2, 3]);
		expect((readBack as any).nested.a).toBe(true);
	});
});
