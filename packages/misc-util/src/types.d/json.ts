import type { JsonObject, JsonValue } from "type-fest";

export type JsonError = JsonObject & {
	name: string;
	message: string;
	stack?: string;
	cause?: JsonError | JsonValue;
};

export type JsonAggregateError = JsonError & {
	errors: (JsonError | JsonValue)[];
};

export type JsonSuppressedError = JsonError & {
	error: JsonError | JsonValue;
	suppressed: JsonError | JsonValue;
};
