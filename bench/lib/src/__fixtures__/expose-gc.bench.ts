import { registerCase, registerCondition } from "@ac-bench/core/runner";

registerCondition("fake", "gc", () => {
	registerCase("fake", "reports gc", (context) => {
		context.setCaseResult({ hasGc: typeof globalThis.gc === "function" });
	});
});
