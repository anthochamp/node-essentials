import { registerCase, registerCondition } from "@ac-bench/core/runner";

registerCondition("fake", "slow", () => {
	// Long enough that any sane per-condition budget fires first.
	registerCase("fake", "never finishes in time", async () => {
		await new Promise((resolve) => setTimeout(resolve, 60_000));
	});
});
