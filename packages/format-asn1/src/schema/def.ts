/**
 * Extracts the decoded output type of a schema def.
 * `ValueOf<Asn1IntegerTypeDef>` → `bigint`
 */
export type DefValueOf<T> = T extends { readonly __output?: infer O }
	? Exclude<O, undefined>
	: never;

/**
 * Extracts the encoded input type of a schema def.
 * `InputOf<Asn1TransformTypeDef<number, bigint>>` → `bigint`
 */
export type DefInputOf<T> = T extends { readonly __input?: infer I }
	? Exclude<I, undefined>
	: never;

/**
 * Common shape shared by every leaf/wrapper def: a `kind` discriminant plus the
 * phantom `__output`/`__input` markers `DefValueOf`/`DefInputOf` read. Never
 * assigned at runtime — purely type-level.
 */
export type Asn1TypeDefBase<
	K extends string = string,
	Output = unknown,
	Input = Output,
> = {
	readonly kind: K;
	readonly __output?: Output;
	readonly __input?: Input;
};
