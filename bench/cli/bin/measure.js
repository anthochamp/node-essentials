#!/usr/bin/env node

import path from "node:path";

import packageJson from "../package.json" with { type: "json" };

const entryPath = packageJson.exports["./cli"];

if (path.extname(entryPath) === ".ts") {
	await import("tsx/esm");
}

const entryUrl = new URL(entryPath, new URL("../", import.meta.url));

await import(entryUrl.href);
