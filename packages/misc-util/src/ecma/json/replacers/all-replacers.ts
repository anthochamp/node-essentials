import { jsonMakeBigIntReplacerFunction } from "./big-int.js";
import {
	type JsonMakeCircularReferenceReplacerFunctionOptions,
	jsonMakeCircularReferenceReplacerFunction,
} from "./circular-reference.js";
import { jsonMakeErrorReplacerFunction } from "./error.js";

export type JsonMakeAllReplacersFunctionOptions = {
	circularReference?: JsonMakeCircularReferenceReplacerFunctionOptions;
};

export function jsonMakeAllReplacersFunction(
	replacer?: JsonReplacer,
	options?: JsonMakeAllReplacersFunctionOptions,
): JsonReplacerFunction {
	return jsonMakeCircularReferenceReplacerFunction(
		jsonMakeBigIntReplacerFunction(jsonMakeErrorReplacerFunction(replacer)),
		options?.circularReference,
	);
}
