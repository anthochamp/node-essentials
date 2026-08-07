import { defineConfig } from "oxlint";

export default defineConfig({
	options: {
		typeAware: true,
		typeCheck: true,
	},
	rules: {
		"typescript/no-duplicate-type-constituents": [
			"warn",
			{ ignoreUnions: true },
		],
		"typescript/no-for-in-array": "off",
	},
});
