import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["packages/*"],
		root: __dirname,
		silent: process.env.CI ? "passed-only" : false,
		logHeapUsage: true,
		typecheck: {
			enabled: true,
		},
	},
});
