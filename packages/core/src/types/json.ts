import { Jsonify } from "type-fest";

/** The function type of the `replacer` parameter in `JSON.stringify` method. */
export type JsonReplacerFunction = (
	this: unknown,
	key: string,
	value: unknown,
) => unknown;

/** The type of the `replacer` parameter in `JSON.stringify` method. */
export type JsonReplacer = JsonReplacerFunction | (string | number)[] | null;

/** The function type of the `reviver` parameter in `JSON.parse` method. */
export type JsonReviverFunction = (
	this: unknown,
	key: string,
	value: unknown,
) => unknown;

/** The type of the `reviver` parameter in `JSON.parse` method. */
export type JsonReviver = JsonReviverFunction | null;

/** Root values `JSON.stringify` serializes to `undefined` instead of a string. */
export type JsonUnserializableRoot =
	| undefined
	| symbol
	| ((...args: never[]) => unknown);

/**
 * Whether `JSON.stringify` returns `undefined` for a root value of type `T`.
 *
 * `toJSON` is resolved first, so `Date` is serializable while a class whose
 * `toJSON` returns `undefined` is not.
 */
export type IsJsonUnserializableRoot<T> = T extends {
	toJSON(...args: never[]): infer TJson;
}
	? IsJsonUnserializableRoot<TJson>
	: T extends JsonUnserializableRoot
		? true
		: false;

/** Return type of `JSON.stringify` for a root value of type `T`. */
export type JsonStringifyResult<T> = unknown extends T
	? string | undefined
	: T extends unknown
		? IsJsonUnserializableRoot<T> extends true
			? undefined
			: string
		: never;

/** Return type of `jsonSerialize` for a root value of type `T`. */
export type JsonSerializeResult<T> = unknown extends T
	? Jsonify<T> | undefined
	: T extends unknown
		? IsJsonUnserializableRoot<T> extends true
			? undefined
			: Jsonify<T>
		: never;
