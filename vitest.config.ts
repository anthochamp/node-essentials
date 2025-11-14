import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["packages/*"],
		silent: process.env.CI ? "passed-only" : false,
	},
});
