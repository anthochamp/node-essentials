import { registerCase, registerCondition } from "@ac-bench/core/runner";

registerCondition("fake", "setup", () => {
	registerCase("fake", "reports the marker", (context) => {
		context.setCaseResult({
			marker: process.env.AC_BENCH_SETUP_MARKER ?? null,
		});
	});
});
