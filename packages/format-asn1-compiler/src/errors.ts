import type { Span } from "@ac-kit/format-asn1-notation";

export class CompileError extends Error {
	readonly severity: "error" | "warning";
	readonly span: Span;

	constructor(
		message: string,
		span: Span,
		severity: "error" | "warning" = "error",
	) {
		super(message);
		this.name = "CompileError";
		this.severity = severity;
		this.span = span;
	}
}
