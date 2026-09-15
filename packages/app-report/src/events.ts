import * as z from "zod/mini";

import { attributesSchema } from "./attributes.js";

export const reportScopeIdSchema = z.string();
export type ReportScopeId = z.infer<typeof reportScopeIdSchema>;

export const reportScopeStatusSchema = z.enum([
	"ok",
	"failed",
	"skipped",
	"cancelled",
]);
export type ReportScopeStatus = z.infer<typeof reportScopeStatusSchema>;

export const reportDiagnosticSeveritySchema = z.enum([
	"info",
	"warning",
	"error",
]);
export type ReportDiagnosticSeverity = z.infer<
	typeof reportDiagnosticSeveritySchema
>;

export const reportOutputStreamSchema = z.enum(["stdout", "stderr"]);
export type ReportOutputStream = z.infer<typeof reportOutputStreamSchema>;

const eventBaseSchema_ = z.object({
	/** Wall-clock milliseconds, from the emitter's clock. */
	timestamp: z.number(),

	/** Scope this event belongs to, or `null` for a root-level event. */
	scopeId: z.nullable(reportScopeIdSchema),
});

export const reportScopeStartEventSchema = z.object({
	kind: z.literal("scope-start"),

	...eventBaseSchema_.shape,

	/** Identifies the scope being opened. Not stable across runs — see `key`. */
	scopeId: reportScopeIdSchema,

	/** Where this scope hangs. `null` makes it a root scope. */
	parentId: z.nullable(reportScopeIdSchema),

	/** Human-readable label. */
	title: z.string(),

	/** Stable identifier across runs, for regression/flake detection. */
	key: z.string(),

	/** Declared unit count, when known up front. */
	total: z.optional(z.number()),

	/** Initial attributes for the scope */
	attributes: z.optional(attributesSchema),
});
export type ReportScopeStartEvent = z.infer<typeof reportScopeStartEventSchema>;

const scopeEventBaseSchema_ = z.object({
	...eventBaseSchema_.shape,

	/** Scope this event is about. */
	scopeId: reportScopeIdSchema,
});

export const reportScopeAttributesEventSchema = z.object({
	kind: z.literal("scope-attributes"),

	...scopeEventBaseSchema_.shape,

	/** Attributes to merge into the scope's existing attributes (shallow merge). */
	attributes: attributesSchema,
});
export type ReportScopeAttributesEvent = z.infer<
	typeof reportScopeAttributesEventSchema
>;

export const reportScopeProgressEventSchema = z.object({
	kind: z.literal("scope-progress"),

	...scopeEventBaseSchema_.shape,

	/** Number of units completed. */
	completed: z.number(),

	/** Optional total number of units. */
	total: z.optional(z.number()),

	/** Optional human-readable message. */
	message: z.optional(z.string()),
});
export type ReportScopeProgressEvent = z.infer<
	typeof reportScopeProgressEventSchema
>;

export const reportScopeHeartbeatEventSchema = z.object({
	kind: z.literal("scope-heartbeat"),

	...scopeEventBaseSchema_.shape,

	/** Optional time since `scope-start`, by the emitter's clock. */
	elapsedMs: z.optional(z.number()),

	/** Optional human-readable message. */
	message: z.optional(z.string()),
});
export type ReportScopeHeartbeatEvent = z.infer<
	typeof reportScopeHeartbeatEventSchema
>;

export const reportDiagnosticSchema = z.object({
	severity: reportDiagnosticSeveritySchema,
	/** Stable, domain-defined identifier, e.g. `"high-variance"`. */
	code: z.optional(z.string()),
	message: z.string(),
	attributes: z.optional(attributesSchema),
});
/** A machine-readable problem report, independent of any domain. */
export type ReportDiagnostic = z.infer<typeof reportDiagnosticSchema>;

export const reportDiagnosticEventSchema = z.object({
	kind: z.literal("diagnostic"),

	...eventBaseSchema_.shape,

	...reportDiagnosticSchema.shape,
});
export type ReportDiagnosticEvent = z.infer<typeof reportDiagnosticEventSchema>;

export const reportScopeEndEventSchema = z.object({
	kind: z.literal("scope-end"),

	...scopeEventBaseSchema_.shape,

	/** Terminal outcome of the scope. */
	status: reportScopeStatusSchema,

	/** Duration of the scope, by the emitter's clock. */
	durationMs: z.number(),

	/** Optional error object, if the scope failed. */
	error: z.optional(z.unknown()),

	/**
	 * Optional attributes to merge into the scope's existing attributes (shallow
	 * merge).
	 */
	attributes: z.optional(attributesSchema),
});
export type ReportScopeEndEvent = z.infer<typeof reportScopeEndEventSchema>;

export const reportOutputEventSchema = z.object({
	kind: z.literal("output"),

	...eventBaseSchema_.shape,

	/** Stream the output was written to. */
	stream: reportOutputStreamSchema,

	/** The output chunk. */
	chunk: z.string(),
});
export type ReportOutputEvent = z.infer<typeof reportOutputEventSchema>;

export const reportAttachmentSchema = z.object({
	/** Optional human-readable name for the attachment. */
	name: z.optional(z.string()),

	/** Media type of the attachment. */
	mediaType: z.string(),

	/** Attachment body, either as a string or binary data. */
	body: z.union([z.string(), z.instanceof(Uint8Array)]),
});
export type ReportAttachment = z.infer<typeof reportAttachmentSchema>;

export const reportAttachmentEventSchema = z.object({
	kind: z.literal("attachment"),

	...eventBaseSchema_.shape,

	...reportAttachmentSchema.shape,
});
export type ReportAttachmentEvent = z.infer<typeof reportAttachmentEventSchema>;

export const reportDataEventSchema = z.object({
	kind: z.literal("data"),

	...eventBaseSchema_.shape,

	/** The payload. */
	data: z.unknown(),
});
export type ReportDataEvent<TData = unknown> = z.infer<
	typeof reportDataEventSchema
> & {
	data: TData;
};

export const reportEventSchema = z.discriminatedUnion("kind", [
	reportScopeStartEventSchema,
	reportScopeAttributesEventSchema,
	reportScopeProgressEventSchema,
	reportScopeHeartbeatEventSchema,
	reportDiagnosticEventSchema,
	reportScopeEndEventSchema,
	reportOutputEventSchema,
	reportAttachmentEventSchema,
	reportDataEventSchema,
]);

type Event_ = z.infer<typeof reportEventSchema>;

export type ReportEventKind = Event_["kind"];

export type ReportEvent<TData = unknown> =
	| Extract<Event_, { kind: Exclude<ReportEventKind, "data"> }>
	| (Extract<Event_, { kind: "data" }> & { data: TData });
