import { Asn1TypeDefBase, DefValueOf } from "../../def.js";
import { AnyAsn1TypeDef } from "../any-def.js";
import { ref, wrapSchema, type Asn1Type } from "../base.js";

/** Lazy wrapper descriptor that stores a schema getter thunk. */
export type Asn1LazyTypeDef<T = unknown> = Asn1TypeDefBase<"lazy", T> & {
	readonly getter: () => AnyAsn1TypeDef;
};

/**
 * Schema for a lazy (self-referential) type.
 *
 * The getter thunk is stored in the def (as a def-returning thunk) so codec
 * walkers can traverse recursive schemas without eagerly evaluating them.
 * TypeScript cannot infer recursive types — annotate the type explicitly:
 *
 * ```typescript
 * interface NodeValue {
 * 	readonly data: Uint8Array;
 * 	readonly next?: NodeValue;
 * }
 * const Node: Asn1LazyType<NodeValue> = lazy(() =>
 * 	sequence([
 * 		component("data", octetString()),
 * 		component("next", Node).optional(),
 * 	]),
 * );
 * ```
 */
export type Asn1LazyType<T> = Asn1Type<Asn1LazyTypeDef<T>>;

export function lazySchema<T>(def: Asn1LazyTypeDef<T>): Asn1LazyType<T> {
	return wrapSchema(def, lazySchema);
}

/** Factory: `LAZY`. Creates a lazy (self-referential) schema. */
export function lazy<D extends AnyAsn1TypeDef>(
	resolve: () => Asn1Type<D>,
): Asn1LazyType<DefValueOf<D>> {
	return lazySchema<DefValueOf<D>>({
		kind: "lazy",
		getter: () => ref(resolve()),
	});
}

/** Convenience: call the schema's getter and return the resolved inner def. */
export function resolveLazy<T>(schema: Asn1LazyType<T>): AnyAsn1TypeDef {
	return ref(schema).getter();
}
