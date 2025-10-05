import { defaults } from "../object/defaults.js";
import { isAggregateErrorLike } from "./aggregate-error.js";
import { type IError, isErrorLike } from "./error.js";
import { isSuppressedErrorLike } from "./suppressed-error.js";

export type TraverseErrorOptions = {
	// step into error.cause (default: true)
	traverseCause?: boolean;

	// step into aggregateError.errors array (default: true)
	traverseAggregateErrors?: boolean;

	// step into suppressedError.error (default: true)
	traverseSuppressedError?: boolean;

	// step into suppressedError.suppressed (default: true)
	traverseSuppressedSuppressed?: boolean;

	// whether to ignore null error values when traversing (default: false)
	skipNullErrors?: boolean;
};

export type TraverseErrorSource =
	| "cause"
	| "aggregate-errors"
	| "suppressed-error"
	| "suppressed-suppressed";

export type TraverseErrorCallback = (
	currentError: unknown, // the error currently being visited
	parentError: IError | null, // the parent error, if any
	source: TraverseErrorSource | null, // how we reached the current error from the parent, or null if no parent
) => boolean | undefined;

const TRAVERSE_ERROR_DEFAULT_OPTIONS: Required<TraverseErrorOptions> = {
	traverseCause: true,
	traverseAggregateErrors: true,
	traverseSuppressedError: true,
	traverseSuppressedSuppressed: true,
	skipNullErrors: false,
};

/**
 * Traverse an error and its inner errors, calling a callback for each error
 * encountered.
 *
 * The traversal can be stopped at any time by returning false from the callback.
 *
 * @param error - The root error to traverse.
 * @param callback - A function called for each error encountered. If it returns false, the traversal stops.
 * @param options - Options to control the traversal behavior.
 */
export function traverseError(
	error: unknown,
	callback: TraverseErrorCallback,
	options?: TraverseErrorOptions,
): void {
	const effectiveOptions = defaults(options, TRAVERSE_ERROR_DEFAULT_OPTIONS);

	internalTraverseError(error, callback, effectiveOptions, new Set());
}

function internalTraverseError(
	error: unknown,
	callback: TraverseErrorCallback,
	options: Required<TraverseErrorOptions>,
	visited: Set<IError>,
	parent?: IError,
	source?: TraverseErrorSource,
): boolean {
	if (error === undefined || (error === null && options.skipNullErrors)) {
		return true;
	}

	let shouldContinue = callback(error, parent ?? null, source ?? null);
	if (shouldContinue === false) {
		return false;
	}

	if (!isErrorLike(error)) {
		return true;
	}

	if (visited.has(error)) {
		return false;
	}
	visited.add(error);

	if (options.traverseAggregateErrors && isAggregateErrorLike(error)) {
		for (const innerError of error.errors) {
			shouldContinue = internalTraverseError(
				innerError,
				callback,
				options,
				visited,
				error,
				"aggregate-errors",
			);

			if (!shouldContinue) {
				return false;
			}
		}
	}

	if (isSuppressedErrorLike(error)) {
		if (options.traverseSuppressedError) {
			shouldContinue = internalTraverseError(
				error.error,
				callback,
				options,
				visited,
				error,
				"suppressed-error",
			);

			if (!shouldContinue) {
				return false;
			}
		}

		if (options.traverseSuppressedSuppressed) {
			shouldContinue = internalTraverseError(
				error.suppressed,
				callback,
				options,
				visited,
				error,
				"suppressed-suppressed",
			);

			if (!shouldContinue) {
				return false;
			}
		}
	}

	if (options.traverseCause) {
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
