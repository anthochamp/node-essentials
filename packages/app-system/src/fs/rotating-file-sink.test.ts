import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import type { ReportEvent } from "@ac-kit/app-report";
import { createTempDir, existsAsync } from "@ac-kit/node";
import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { RotatingFileSink } from "./rotating-file-sink.js";

function dataEvent(data: number): ReportEvent<number> {
	return { kind: "data", timestamp: 0, scopeId: null, data };
}

const formatter = (event: ReportEvent<number>) =>
	event.kind === "data" ? `line ${event.data}` : null;

let tempDir: string;
let filePath: string;

beforeEach(async () => {
	tempDir = await createTempDir("rotating-file-sink-test");
	filePath = join(tempDir, "out.log");
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

suite("RotatingFileSink", () => {
	test("writes formatted lines to the file", async () => {
		const sink = new RotatingFileSink<number>(filePath, { formatter });

		await sink.write(dataEvent(1));
		await sink.write(dataEvent(2));
		await sink.close();

		expect(await readFile(filePath, "utf8")).toBe("line 1\nline 2\n");
	});

	test("never creates the file when the formatter renders every event as null", async () => {
		const sink = new RotatingFileSink<number>(filePath, {
			formatter: () => null,
		});

		await sink.write(dataEvent(1));
		await sink.close();

		expect(await existsAsync(filePath)).toBe(false);
	});

	test("uses a custom eol", async () => {
		const sink = new RotatingFileSink<number>(filePath, {
			formatter,
			eol: "\r\n",
		});

		await sink.write(dataEvent(1));
		await sink.close();

		expect(await readFile(filePath, "utf8")).toBe("line 1\r\n");
	});

	test("rotates once the file exceeds cutOffFileSize", async () => {
		const sink = new RotatingFileSink<number>(filePath, {
			formatter,
			cutOffFileSize: 10,
			maxRetainedFiles: 5,
			minFileHistoryDurationMs: 0,
		});

		await sink.write(dataEvent(1));
		await sink.flush();
		// The first write already exceeds cutOffFileSize (10 bytes); the next
		// write's post-write rotation check is what triggers the rotation.
		await sink.write(dataEvent(2));
		await sink.flush();
		await sink.close();

		expect(await existsAsync(`${filePath}.0`)).toBe(true);
	});

	test("does not rotate when neither cutOffFileSize nor maxFileAgeMs is set", async () => {
		const sink = new RotatingFileSink<number>(filePath, {
			formatter,
			cutOffFileSize: null,
			maxFileAgeMs: null,
		});

		await sink.write(dataEvent(1));
		await sink.write(dataEvent(2));
		await sink.close();

		expect(await existsAsync(`${filePath}.0`)).toBe(false);
	});

	test("compresses the rotated file when useCompression is true", async () => {
		const sink = new RotatingFileSink<number>(filePath, {
			formatter,
			cutOffFileSize: 10,
			useCompression: true,
			minFileHistoryDurationMs: 0,
		});

		await sink.write(dataEvent(1));
		await sink.flush();
		await sink.write(dataEvent(2));
		await sink.flush();
		await sink.close();

		expect(await existsAsync(`${filePath}.0.gz`)).toBe(true);
		expect(await existsAsync(`${filePath}.0`)).toBe(false);
	});
});
