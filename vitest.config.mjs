import { globSync } from "node:fs";
import { dirname } from "node:path";

import { defineConfig } from "vitest/config";

import packageJson from "./package.json" with { type: "json" };

// Workspace globs also match stray non-package files (a loose file with no
// sibling package.json inside a group directory), which vitest rejects.
const projects = globSync(
	packageJson.workspaces.map((workspace) => `${workspace}/package.json`),
).map(dirname);

export default defineConfig({
	test: {
		projects,
		silent: process.env.CI ? "passed-only" : false,
		coverage: {
			reportsDirectory: ".temp/coverage",
		},
	},
});
