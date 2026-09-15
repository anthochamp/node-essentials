/**
 * The CBOR generic data model (RFC 8949 §2) — the single value tree shared by
 * the binary codec, the diagnostic-notation codec, and the JSON bridge.
 *
 * Integers and floating-point values are distinct even when numerically equal
 * (RFC 8949 §2), so `int` always carries a `bigint` and `float` always carries
 * a JS `number` (binary64) — never conflated.
 */
export type DataValue =
	| { readonly kind: "int"; readonly value: bigint }
	| { readonly kind: "float"; readonly value: number }
	| { readonly kind: "bytes"; readonly value: Uint8Array }
	| { readonly kind: "text"; readonly value: string }
	| { readonly kind: "array"; readonly items: readonly DataValue[] }
	| {
			readonly kind: "map";
			readonly entries: readonly (readonly [DataValue, DataValue])[];
	  }
	| { readonly kind: "tag"; readonly tag: bigint; readonly value: DataValue }
	| { readonly kind: "bool"; readonly value: boolean }
	| { readonly kind: "null" }
	| { readonly kind: "undefined" }
	/** An unassigned simple value (RFC 8949 §3.3), 0-19 or 32-255. */
	| { readonly kind: "simple"; readonly value: number };
