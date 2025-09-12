/**
 * Create a JSON replacer function that combines a base replacer function with
 * an optional user-defined replacer (function or property list).
 *
 * The resulting function applies the base replacer first, then the user replacer if provided,
 * and finally filters properties based on the property list if provided.
 *
 * @param baseReplacerFunction The base replacer function to apply first.
 * @param userReplacer An optional user-defined replacer (function or property list).
 * @returns A combined JSON replacer function.
 */
export function makeJsonReplacerFunction(
	baseReplacerFunction: JsonReplacerFunction,
	userReplacer?: JsonReplacer,
): JsonReplacerFunction {
	if (userReplacer === null || userReplacer === undefined) {
		return baseReplacerFunction;
	}

	const userPropertyList = Array.isArray(userReplacer) ? userReplacer : null;
	const userReplacerFn =
		typeof userReplacer === "function" ? userReplacer : null;

	return function (key, value) {
		value = baseReplacerFunction.call(this, key, value);

		// Apply user replacer function if provided
		if (userReplacerFn) {
			value = userReplacerFn.call(this, key, value);
		}

		// Apply property list filtering if provided
		if (userPropertyList) {
			if (this && typeof this === "object" && !Array.isArray(this)) {
				if (!userPropertyList.includes(key)) {
					return;
				}
			}
		}

		return value;
	};
}
