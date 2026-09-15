import { beforeEach, describe, expect, it } from "vitest";

import {
	BENCH_PROTOCOL_VERSION,
	ConditionIdentityMismatchError,
	describeConditions,
	forkUnitKey,
	MalformedMessageError,
	parseChildMessage,
	parseParentMessage,
	resolveForkUnit,
} from "./protocol.js";
import {
	drainConditions,
	registerCase,
	registerCondition,
} from "./registry.js";

const MEASURE = "duration";

function registerNestedExample_(): void {
	registerCondition(MEASURE, "foo", () => {
		registerCondition(MEASURE, "bar", () => {
			registerCase(MEASURE, "dux", () => {});
		});
		registerCase(MEASURE, "fax", () => {});
	});
}
describe("parseParentMessage", () => {
	it("should accept a start message and keep its optional fields absent", () => {
		const message = parseParentMessage({
			t: "start",
			file: "a.bench.ts",
			conditionPath: [0, 0],
			conditionTitles: ["foo", "bar"],
			parentScopeId: null,
			arm: "shared",
			replicate: 0,
			rounds: 1,
			orderSeed: 0,
			emitSamples: false,
		});

		expect(message).toMatchObject({ t: "start", conditionPath: [0, 0] });
	});

	it("should accept the handshake carrying the artifact cache root", () => {
		const message = parseParentMessage({
			t: "hello",
			version: BENCH_PROTOCOL_VERSION,
			runId: "run-1",
			artifactCacheRoot: "/tmp/cache",
		});

		expect(message).toEqual({
			t: "hello",
			version: BENCH_PROTOCOL_VERSION,
			runId: "run-1",
			artifactCacheRoot: "/tmp/cache",
		});
	});

	it("should reject an unknown discriminant", () => {
		expect(() => parseParentMessage({ t: "nope" })).toThrow(
			MalformedMessageError,
		);
	});

	it("should reject a start message missing a required field", () => {
		expect(() =>
			parseParentMessage({ t: "start", file: "a.bench.ts" }),
		).toThrow(MalformedMessageError);
	});
});

describe("parseChildMessage", () => {
	it("should accept a conditions message with a nested tree", () => {
		const message = parseChildMessage({
			t: "conditions",
			conditions: [
				{
					title: "foo",
					measure: MEASURE,
					entries: [
						{
							kind: "condition",
							condition: {
								title: "bar",
								measure: MEASURE,
								entries: [{ kind: "case", title: "dux" }],
							},
						},
						{ kind: "case", title: "fax" },
					],
				},
			],
		});

		expect(message).toMatchObject({ t: "conditions" });
	});

	it("should accept an event message with an opaque payload", () => {
		expect(
			parseChildMessage({ t: "event", seq: 3, event: { kind: "anything" } }),
		).toMatchObject({ t: "event", seq: 3 });
	});

	it("should reject a done message with an unknown status", () => {
		expect(() =>
			parseChildMessage({ t: "done", seq: 1, status: "exploded" }),
		).toThrow(MalformedMessageError);
	});
});

describe("describeConditions", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("should project the registered tree onto the wire shape", () => {
		registerNestedExample_();

		expect(describeConditions(drainConditions())).toEqual([
			{
				title: "foo",
				measure: MEASURE,
				entries: [
					{
						kind: "condition",
						condition: {
							title: "bar",
							measure: MEASURE,
							entries: [{ kind: "case", title: "dux" }],
						},
					},
					{ kind: "case", title: "fax" },
				],
			},
		]);
	});

	it("should describe every sibling condition, not only the first", () => {
		registerCondition(MEASURE, "outer", () => {
			registerCondition(MEASURE, "first", () => {
				registerCase(MEASURE, "a", () => {});
			});
			registerCondition(MEASURE, "second", () => {
				registerCase(MEASURE, "b", () => {});
			});
			registerCondition(MEASURE, "third", () => {
				registerCase(MEASURE, "c", () => {});
			});
		});

		const [outer] = describeConditions(drainConditions());

		expect(
			outer?.entries.map((entry) =>
				entry.kind === "condition" ? entry.condition.title : entry.title,
			),
		).toEqual(["first", "second", "third"]);
	});
});

describe("resolveForkUnit", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("should resolve the condition, its ancestors and its inherited cases", () => {
		registerNestedExample_();

		const unit = resolveForkUnit(drainConditions(), [0, 0], ["foo", "bar"]);

		expect(unit.condition.title).toBe("bar");
		expect(unit.ancestors.map((level) => level.title)).toEqual(["foo"]);
		expect(unit.cases.map((benchCase) => benchCase.title)).toEqual([
			"dux",
			"fax",
		]);
	});

	it("should report the level whose title changed", () => {
		registerNestedExample_();

		try {
			resolveForkUnit(drainConditions(), [0, 0], ["foo", "renamed"]);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ConditionIdentityMismatchError);
			expect(error).toMatchObject({
				level: 1,
				expectedTitle: "renamed",
				foundTitle: "bar",
			});
		}
	});

	it("should report a missing level as not found", () => {
		registerNestedExample_();

		try {
			resolveForkUnit(drainConditions(), [0, 7], ["foo", "bar"]);
			expect.unreachable();
		} catch (error) {
			expect(error).toMatchObject({ level: 1, foundTitle: null });
		}
	});
});

describe("forkUnitKey", () => {
	it("should combine the file, the path and the titles", () => {
		expect(forkUnitKey("a/b.bench.ts", [0, 1], ["foo", "bar"])).toBe(
			"a/b.bench.ts#0.1:foo > bar",
		);
	});
});
