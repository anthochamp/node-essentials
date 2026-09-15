import type { Span } from "@ac-kit/core";

interface DiagNodeBase {
	readonly span: Span;
	/**
	 * Comments (`/ ... /`, EDN — RFC 8610 Appendix G.6) immediately preceding
	 * this node.
	 */
	readonly leadingComments: readonly string[];
}

/**
 * The parsed tree for CBOR diagnostic notation.
 *
 * There is no separate CST here: unlike `@ac-kit/format-asn1-notation` (where
 * many syntactically different forms — tag class keywords, parenthesization,
 * `IMPLICIT`/`EXPLICIT` — collapse to the same semantic AST), diagnostic
 * notation has essentially no such redundancy: it is already a near-literal
 * rendering of the {@link DataValue} tree it represents. Attaching `span` and
 * `leadingComments` directly to the value tree is therefore lossless on its
 * own; a redundant middle tree would carry no information the value tree
 * doesn't already have.
 */
export type DiagNode = DiagNodeBase &
	(
		| { readonly kind: "int"; readonly value: bigint }
		| { readonly kind: "float"; readonly value: number }
		| { readonly kind: "bytes"; readonly value: Uint8Array }
		| { readonly kind: "text"; readonly value: string }
		| { readonly kind: "array"; readonly items: readonly DiagNode[] }
		| {
				readonly kind: "map";
				readonly entries: readonly (readonly [DiagNode, DiagNode])[];
		  }
		| { readonly kind: "tag"; readonly tag: bigint; readonly value: DiagNode }
		| { readonly kind: "bool"; readonly value: boolean }
		| { readonly kind: "null" }
		| { readonly kind: "undefined" }
		| { readonly kind: "simple"; readonly value: number }
	);
