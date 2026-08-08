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
