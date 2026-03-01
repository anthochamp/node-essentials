import { defaults } from "../../object/defaults.js";
import { jsonMakeReplacerFunction } from "../make-replacer-function.js";

export type JsonMakeCircularReferenceReplacerFunctionOptions = {
	placeholder?: string;
};

const JSON_MAKE_CIRCULAR_REFERENCE_REPLACER_FUNCTION_DEFAULT_OPTIONS: Required<JsonMakeCircularReferenceReplacerFunctionOptions> =
	{
		placeholder: "[Circular]",
	};

/**
 * Create a JSON replacer function that safely handles circular references by
 * replacing them with a specified placeholder string.
 *
 * This function uses a WeakMap to track parent objects during serialization,
 * allowing it to detect circular references and replace them with the provided
 * placeholder. It can be combined with an optional user-defined replacer for
 * additional customization.
 *
 * @param replacer An optional user-defined replacer (function or property list) to apply after the circular reference handling.
 * @param options Options for configuring the circular safe replacer function, including the placeholder string to use for circular references.
 * @returns A JSON replacer function that handles circular references and applies the user-defined replacer if provided.
 */
export function jsonMakeCircularReferenceReplacerFunction(
	replacer?: JsonReplacer,
	options?: JsonMakeCircularReferenceReplacerFunctionOptions,
): JsonReplacerFunction {
	const { placeholder } = defaults(
		options,
		JSON_MAKE_CIRCULAR_REFERENCE_REPLACER_FUNCTION_DEFAULT_OPTIONS,
	);

	const parentsMap = new WeakMap<object, object | null>();

	function jsonReplacerCircularReplacer(
		this: unknown,
		_key: string,
		value: unknown,
	): unknown {
		if (typeof value === "object" && value !== null) {
			const parent = this as object | null;

			if (typeof parent === "object" && parent !== null) {
				let current: object | null | undefined = parent;
				while (current) {
					if (current === value) {
						return placeholder;
					}
					current = parentsMap.get(current);
				}

				if (!parentsMap.has(value)) {
					parentsMap.set(value, parent);
				}
			}
		}

		return value;
	}

	return jsonMakeReplacerFunction(jsonReplacerCircularReplacer, replacer);
}
