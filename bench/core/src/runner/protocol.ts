import {
	reportScopeIdSchema,
	reportScopeStatusSchema,
} from "@ac-kit/app-report";
import * as z from "zod/mini";

import { measurementArmSchema } from "../common/measure-data.js";
import { assembleForkUnitCases, ForkUnit } from "./fork-units.js";
import { BenchCondition } from "./registry.js";

/**
 * Bumped whenever a message's shape changes in a way an older peer cannot read.
 * A mismatch aborts that condition rather than the run.
 */
export const BENCH_PROTOCOL_VERSION = 1;

/** One item of a discovered condition body, in declaration order. */
export type DiscoveredEntry =
	| { kind: "case"; title: string }
	| { kind: "condition"; condition: DiscoveredCondition };

/**
 * A node of the condition tree a discovery child reports back. `entries`
 * mirrors the registered body exactly, so an index into it is a valid
 * `conditionPath` step.
 */
export type DiscoveredCondition = {
	title: string;
	measure: string;
	entries: DiscoveredEntry[];
};

export const discoveredConditionSchema: z.ZodMiniType<DiscoveredCondition> =
	z.object({
		title: z.string(),
		measure: z.string(),
		entries: z.array(
			z.discriminatedUnion("kind", [
				z.object({ kind: z.literal("case"), title: z.string() }),
				z.object({
					kind: z.literal("condition"),
					condition: z.lazy(() => discoveredConditionSchema),
				}),
			]),
		),
	});

export const parentHelloMessageSchema = z.object({
	t: z.literal("hello"),
	version: z.number(),
	runId: z.string(),
	/**
	 * Resolved by the parent, because a child whose `cwd` differs would otherwise
	 * resolve `node_modules/.cache` somewhere else.
	 */
	artifactCacheRoot: z.string(),
	/**
	 * Imported by every child before any bench file, in order. There is no
	 * run-level or file-level hook, so this is the one place per-child setup can
	 * happen — and its cost is paid once per fork unit, which is what a caller
	 * asking for it is asking for.
	 */
	setupFiles: z.optional(z.array(z.string())),
});

export const listMessageSchema = z.object({
	t: z.literal("list"),
	file: z.string(),
});

export const startMessageSchema = z.object({
	t: z.literal("start"),
	file: z.string(),
	/** Child indices from the file's roots down to the fork unit. */
	conditionPath: z.array(z.number()),
	/** Titles along `conditionPath`, for the identity check. */
	conditionTitles: z.array(z.string()),
	/** The parent-owned ancestor scope this fork unit hangs under. */
	parentScopeId: z.nullable(reportScopeIdSchema),
	arm: measurementArmSchema,
	/** 0-based index within its arm, identifying the execution. */
	replicate: z.number(),
	/** Round-robin rounds. Always 1 in the isolated arm. */
	rounds: z.number(),
	/** Seeds case-order randomisation, so a run is reproducible. */
	orderSeed: z.number(),
	/** Not inherited by child processes; forwarded explicitly. */
	hashSeed: z.optional(z.number()),
	caseFilter: z.optional(z.array(z.string())),
	measureOptions: z.optional(z.record(z.string(), z.unknown())),
	emitSamples: z.boolean(),
});

export const ackMessageSchema = z.object({
	t: z.literal("ack"),
	/** The parent has consumed every event up to and including this one. */
	seq: z.number(),
});

export const abortMessageSchema = z.object({
	t: z.literal("abort"),
	reason: z.string(),
});

export const parentMessageSchema = z.discriminatedUnion("t", [
	parentHelloMessageSchema,
	listMessageSchema,
	startMessageSchema,
	ackMessageSchema,
	abortMessageSchema,
]);
export type ParentMessage = z.infer<typeof parentMessageSchema>;
export type ParentHelloMessage = z.infer<typeof parentHelloMessageSchema>;
export type StartMessage = z.infer<typeof startMessageSchema>;

export const childHelloMessageSchema = z.object({
	t: z.literal("hello"),
	version: z.number(),
	pid: z.number(),
});

export const conditionsMessageSchema = z.object({
	t: z.literal("conditions"),
	conditions: z.array(discoveredConditionSchema),
});

export const eventMessageSchema = z.object({
	t: z.literal("event"),
	seq: z.number(),
	/** A serialized `ReportEvent`, parsed separately by the receiver. */
	event: z.unknown(),
});

export const droppedMessageSchema = z.object({
	t: z.literal("dropped"),
	seq: z.number(),
	count: z.number(),
	kinds: z.array(z.string()),
});

export const doneMessageSchema = z.object({
	t: z.literal("done"),
	seq: z.number(),
	status: reportScopeStatusSchema,
});

export const fatalMessageSchema = z.object({
	t: z.literal("fatal"),
	seq: z.number(),
	error: z.unknown(),
});

export const childMessageSchema = z.discriminatedUnion("t", [
	childHelloMessageSchema,
	conditionsMessageSchema,
	eventMessageSchema,
	droppedMessageSchema,
	doneMessageSchema,
	fatalMessageSchema,
]);
export type ChildMessage = z.infer<typeof childMessageSchema>;

/** A message that did not match its schema. */
export class MalformedMessageError extends Error {
	constructor(
		readonly origin: "parent" | "child",
		reason: string,
		readonly value: unknown,
	) {
		super(`malformed ${origin} message: ${reason}`);
		this.name = "MalformedMessageError";
	}
}

/** The two ends of the channel disagree on {@link BENCH_PROTOCOL_VERSION}. */
export class ProtocolVersionMismatchError extends Error {
	constructor(
		readonly expected: number,
		readonly received: number,
	) {
		super(`expected bench protocol version ${expected}, got ${received}`);
		this.name = "ProtocolVersionMismatchError";
	}
}

/** The bench file changed between discovery and execution. */
export class ConditionIdentityMismatchError extends Error {
	constructor(
		readonly level: number,
		readonly expectedTitle: string,
		readonly foundTitle: string | null,
	) {
		super(
			`condition path level ${level} should be "${expectedTitle}", found ${foundTitle === null ? "nothing" : `"${foundTitle}"`}`,
		);
		this.name = "ConditionIdentityMismatchError";
	}
}

/** @throws {MalformedMessageError} When `value` is not a valid parent message. */
export function parseParentMessage(value: unknown): ParentMessage {
	const parsed = parentMessageSchema.safeParse(value);

	if (!parsed.success) {
		throw new MalformedMessageError(
			"parent",
			z.prettifyError(parsed.error),
			value,
		);
	}

	return parsed.data;
}

/** @throws {MalformedMessageError} When `value` is not a valid child message. */
export function parseChildMessage(value: unknown): ChildMessage {
	const parsed = childMessageSchema.safeParse(value);

	if (!parsed.success) {
		throw new MalformedMessageError(
			"child",
			z.prettifyError(parsed.error),
			value,
		);
	}

	return parsed.data;
}

/**
 * The cross-run identity of a fork unit: stable under re-ordering (the titles)
 * and unique across files and sibling groups (the path).
 */
export function forkUnitKey(
	file: string,
	conditionPath: readonly number[],
	conditionTitles: readonly string[],
): string {
	return `${file}#${conditionPath.join(".")}:${conditionTitles.join(" > ")}`;
}

/**
 * Projects a registered condition tree onto the wire shape, dropping every
 * hook.
 */
export function describeConditions(
	conditions: readonly BenchCondition[],
): DiscoveredCondition[] {
	return conditions.map(describeCondition_);
}

function describeCondition_(condition: BenchCondition): DiscoveredCondition {
	return {
		title: condition.title,
		measure: condition.measure,
		entries: condition.entries.map((entry) =>
			entry.kind === "case"
				? { kind: "case" as const, title: entry.case.title }
				: {
						kind: "condition" as const,
						condition: describeCondition_(entry.condition),
					},
		),
	};
}

/**
 * Walks `conditionPath` through a freshly drained tree and checks the title at
 * every level, which is what catches a bench file that changed between
 * discovery and execution.
 *
 * @throws {ConditionIdentityMismatchError} At the first level that disagrees.
 */
export function resolveForkUnit(
	roots: readonly BenchCondition[],
	conditionPath: readonly number[],
	conditionTitles: readonly string[],
): ForkUnit {
	const chain: BenchCondition[] = [];

	for (const [level, index] of conditionPath.entries()) {
		const parent = chain[level - 1];
		const found =
			parent === undefined ? roots[index] : conditionAtEntry_(parent, index);
		const expectedTitle = conditionTitles[level] ?? "";

		if (found === undefined || found.title !== expectedTitle) {
			throw new ConditionIdentityMismatchError(
				level,
				expectedTitle,
				found?.title ?? null,
			);
		}

		chain.push(found);
	}

	const condition = chain[chain.length - 1];

	if (condition === undefined) {
		throw new ConditionIdentityMismatchError(0, conditionTitles[0] ?? "", null);
	}

	return {
		condition,
		ancestors: chain.slice(0, -1),
		path: [...conditionPath],
		titles: [...conditionTitles],
		cases: assembleForkUnitCases(chain, conditionPath),
	};
}

function conditionAtEntry_(
	parent: BenchCondition,
	index: number,
): BenchCondition | undefined {
	const entry = parent.entries[index];

	return entry?.kind === "condition" ? entry.condition : undefined;
}
