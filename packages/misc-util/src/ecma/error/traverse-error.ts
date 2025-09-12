import { defaults } from "../object/defaults.js";
import { isAggregateErrorLike } from "./aggregate-error.js";
import { type IError, isErrorLike } from "./error.js";

export type TraverseErrorOptions = {
	// step into error.cause (default: true)
	traverseCauses?: boolean;

	// step into aggregateError.errors array (default: true)
	traverseAggregateErrors?: boolean;
};

export type TraverseErrorSource = "cause" | "aggregate";

export type TraverseErrorCallback = (
	currentError: IError, // the error currently being visited
	parentError: IError | null, // the parent error, if any
	source: TraverseErrorSource | null, // how we reached the current error from the parent (cause or aggregate), or null if no parent
) => boolean | undefined;

const TRAVERSE_ERROR_DEFAULT_OPTIONS: Required<TraverseErrorOptions> = {
	traverseCauses: true,
	traverseAggregateErrors: true,
};

/**
 * Traverse an error and its inner errors (causes and/or aggregate errors),
 * calling a callback for each error encountered.
 *
 * The traversal can be stopped at any time by returning false from the callback.
 *
 * @param error - The root error to traverse.
 * @param callback - A function called for each error encountered. If it returns false, the traversal stops.
 * @param options - Options to control the traversal behavior.
 */
export function traverseError(
	error: IError,
	callback: TraverseErrorCallback,
	options?: TraverseErrorOptions,
): void {
	const effectiveOptions = defaults(options, TRAVERSE_ERROR_DEFAULT_OPTIONS);

	internalTraverseError(error, callback, effectiveOptions, new Set());
}

function internalTraverseError(
	error: IError,
	callback: TraverseErrorCallback,
	options: Required<TraverseErrorOptions>,
	visited: Set<IError>,
	parent?: IError,
	source?: TraverseErrorSource,
): boolean {
	if (visited.has(error)) {
		return false;
	}
	visited.add(error);

	let shouldContinue = callback(error, parent ?? null, source ?? null);
	if (shouldContinue === false) {
		return false;
	}

	if (options.traverseAggregateErrors && isAggregateErrorLike(error)) {
		for (const innerError of error.errors) {
			if (isErrorLike(innerError)) {
				shouldContinue = internalTraverseError(
					innerError,
					callback,
					options,
					visited,
					error,
					"aggregate",
				);

				if (!shouldContinue) {
					return false;
				}
			}
		}
	}

	if (options.traverseCauses && isErrorLike(error.cause)) {
		shouldContinue = internalTraverseError(
			error.cause,
			callback,
			options,
			visited,
			error,
			"cause",
		);

		if (!shouldContinue) {
			return false;
		}
	}

	return true;
}
