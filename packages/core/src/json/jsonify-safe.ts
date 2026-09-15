import type { Jsonify, JsonValue, TypedArray } from "type-fest";

import { IsJsonUnserializableRoot } from "../types/json.js";

type JsonSafeErrorProperty_<T, TKey extends PropertyKey> = TKey extends keyof T
	? JsonSafeSource_<T[TKey]>
	: undefined;

type JsonSafeError_<T extends Error> = {
	name: string;
	message: string;
	stack: string | undefined;
	cause: JsonSafeErrorProperty_<T, "cause">;
	errors: JsonSafeErrorProperty_<T, "errors">;
	suppressed: JsonSafeErrorProperty_<T, "suppressed">;
	error: JsonSafeErrorProperty_<T, "error">;
} & JsonSafeSource_<
	Omit<
		T,
		"name" | "message" | "stack" | "cause" | "errors" | "suppressed" | "error"
	>
>;

// `toJSON` is applied before the replacer runs, so it wins over every transform below.
type JsonSafeSource_<T> = unknown extends T
	? JsonValue | undefined
	: T extends { toJSON(...args: never[]): unknown }
		? T
		: T extends bigint
			? number | string
			: T extends Error
				? JsonSafeError_<T>
				: T extends
							| string
							| number
							| boolean
							| null
							| undefined
							| symbol
							| ((...args: never[]) => unknown)
							| Map<unknown, unknown>
							| Set<unknown>
							| TypedArray
					? T
					: T extends object
						? { [K in keyof T]: JsonSafeSource_<T[K]> }
						: T;

/**
 * `Jsonify` corrected for the replacers applied by the `*Safe` JSON helpers:
 * BigInt becomes a number or a string, and Error objects become plain objects
 * carrying their non-enumerable properties.
 *
 * @template T The value type being serialized.
 */
export type JsonifySafe<T> = Jsonify<JsonSafeSource_<T>>;

/** Return type of `jsonSerializeSafe` for a root value of type `T`. */
export type JsonSerializeSafeResult<T> = unknown extends T
	? JsonifySafe<T> | undefined
	: T extends unknown
		? IsJsonUnserializableRoot<T> extends true
			? undefined
			: JsonifySafe<T>
		: never;
