import { defineConfig } from "vitest/config";
import packageJson from "./package.json";

export default defineConfig({
	test: {
		projects: packageJson.workspaces,
		silent: process.env.CI ? "passed-only" : false,
		coverage: {
			reportsDirectory: ".temp/coverage",
		},
	},
});
