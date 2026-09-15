import { registerCondition, registerCase } from "@ac-bench/core/runner";

registerCondition("fake", "crashing", () => {
	// Yields first so the queued scope-start events actually reach the parent —
	// what is under test is a crash mid-case, not a crash before reporting.
	registerCase("fake", "kills itself", async () => {
		await new Promise((resolve) => setTimeout(resolve, 100));

		process.exit(3);
	});
});
