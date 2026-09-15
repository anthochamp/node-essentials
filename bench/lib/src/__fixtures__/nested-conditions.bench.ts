import {
	registerBeforeAll,
	registerCondition,
	registerCase,
} from "@ac-bench/core/runner";

registerCondition("fake", "foo", () => {
	registerBeforeAll(() => {
		process.stdout.write("foo:beforeAll\n");
	});

	registerCondition("fake", "bar", () => {
		registerCase("fake", "dux", (context) => {
			context.setCaseResult({ value: 1 });
		});
	});

	registerCase("fake", "fax", (context) => {
		context.setCaseResult({ value: 2 });
	});
});
