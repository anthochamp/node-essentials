import type { Span } from "./span.js";

export type TriviaKind = "whitespace" | "lineComment" | "blockComment";

export interface Trivia {
	readonly kind: TriviaKind;
	readonly span: Span;
	readonly text: string;
}
