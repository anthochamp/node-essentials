import { defineProject as vitestDefineProject } from "vitest/config";

export function defineProject(options) {
	return vitestDefineProject({
		...options,
		test: {
			environment: "node",
			...options?.test,
		},
	});
}
