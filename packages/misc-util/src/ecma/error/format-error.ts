import { defaults } from "../object/defaults.js";
import { joinNonEmpty } from "../string/join-non-empty.js";
import { prefixLines } from "../string/prefix-lines.js";
import { isAggregateErrorLike } from "./aggregate-error.js";
import { type IError, isErrorLike } from "./error.js";
import { formatErrorStack, parseErrorStack } from "./error-stack.js";
import { isSuppressedErrorLike } from "./suppressed-error.js";

export type FormatErrorOptions = {
	// Prefix to add to the formatted error
	//
	// If provided, the prefix will be added at the beginning of the message,
	// followed by a colon and a space.
	// If not provided or empty, no prefix will be added.
	//
	// Defaults to an empty string.
	prefix?: string;

	// Whether to skip recursing in causes
	//
	// If false, and if the error has a `cause` property that is an Error-like
	// object, the cause will be included in the output, formatted recursively.
	// If the `cause` property is not an Error-like object, it will be included
	// using the `stringifier` option.
	//
	// Defaults to false.
	skipCause?: boolean;

	// Whether to skip recursing into aggregated errors
	//
	// If false, and if the error is an AggregateError, the aggregated errors
	// will be included in the output, formatted recursively.
	//
	// Defaults to false.
	skipAggregateErrors?: boolean;

	// Whether to skip recursing into suppressed errors
	//
	// If false, and if the error is a SuppressedError, the suppressed error
	// (`error` member) will be included in the output, formatted recursively.
	//
	// Defaults to false.
	skipSuppressedError?: boolean;

	// Whether to skip recursing into suppressed errors of suppressed errors
	//
	// If false, and if the error is a SuppressedError, the suppressed error
	// (`suppressed` member) will be included in the output, formatted recursively.
	//
	// Ignored if `skipSuppressedError` is true.
	//
	// Defaults to false.
	skipSuppressedSuppressed?: boolean;

	// Whether to show or hide the error name
	//
	// Error names will be included as `ErrorName: ` before the message if the
	// output is multi-line (see stackTrace), or `<ErrorName> ` if single-line.
	//
	// Defaults to false.
	hideErrorName?: boolean;

	// Stringifier to use for non-error values
	//
	// Defaults to JSON.stringify for non-string values, and the identity function for strings.
	stringifier?: (value: unknown) => string;

	// Whether to include stack traces.
	//
	// If `true`, the stack trace will be included for all errors.
	// If `"top-level-only"`, only the top-level error will include the stack trace.
	// If `false`, no stack traces will be included.
	//
	// If the value is `true`, and if either `skipCauses` or `skipAggregateErrors`
	// is `false`, the result will be formatted in multiple lines.
	//
	// Defaults to false.
	stackTrace?: boolean | "top-level-only";

	// The indentation to use when necessary.
	//
	// Defaults to two spaces.
	indentation?: string;

	// The line separator to use when joining multiple lines.
	//
	// Defaults to `\n`.
	lineSeparator?: string;
};

const FORMAT_ERROR_DEFAULT_OPTIONS: Required<FormatErrorOptions> = {
	prefix: "",
	skipCause: false,
	skipAggregateErrors: false,
	skipSuppressedError: false,
	skipSuppressedSuppressed: false,
	hideErrorName: false,
	stringifier: (value) =>
		typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
	stackTrace: false,
	indentation: "  ",
	lineSeparator: "\n",
};

/**
 * Format errors and other values into a single string.
 *
 * This function can handle nested causes and aggregated errors, formatting them
 * recursively. It also allows customization of the output format through various
 * options.
 *
 * The default options can be overridden by setting the `formatError.defaultOptions`
 * property.
 *
 * @param error The error or value to format
 * @param options Options for formatting the error
 * @returns The formatted error as a string
 */
export function formatError(
	error: unknown,
	options?: FormatErrorOptions,
): string {
	const effectiveOptions = defaults(options, formatError.defaultOptions);

	const isMultiline =
		effectiveOptions.stackTrace === true &&
		(!effectiveOptions.skipCause || !effectiveOptions.skipAggregateErrors);

	return internalFormatError(
		error,
		effectiveOptions,
		isMultiline,
		new Set<IError>(),
	).join(effectiveOptions.lineSeparator);
}

function internalFormatError(
	error: unknown,
	options: Required<FormatErrorOptions>,
	isMultiline: boolean,
	visitedErrors: Set<IError>,
): string[] {
	const firstLine: string[] = [];
	const otherLines: string[] = [];

	let currentError = error;
	do {
		if (isErrorLike(currentError)) {
			const currentVisitedErrors = new Set(visitedErrors);
			const circularReference = currentVisitedErrors.has(currentError);
			currentVisitedErrors.add(currentError);

			let messagePrefix: string | undefined;
			if (!options.hideErrorName) {
				messagePrefix = isMultiline
					? `${currentError.name}: `
					: `<${currentError.name}> `;
			}

			firstLine.push(
				`${messagePrefix ?? ""}${currentError.message}${circularReference ? " [Circular]" : ""}`,
			);

			if (circularReference) {
				break;
			}

			if (
				(options.stackTrace === true ||
					(options.stackTrace === "top-level-only" &&
						currentError === error)) &&
				currentError.stack
			) {
				const errorStack = parseErrorStack(currentError);
				if (errorStack) {
					otherLines.push(
						...formatErrorStack(errorStack, {
							indentation: options.indentation,
							skipMessage: true,
						}),
					);
				}
			}

			if (!options.skipAggregateErrors && isAggregateErrorLike(currentError)) {
				const innerErrorsResult = currentError.errors.map((innerError, index) =>
					internalFormatError(
						innerError,
						{
							...options,
							prefix: `${isMultiline ? "Error " : ""}#${index + 1}`,
							stackTrace: options.stackTrace === true,
						},
						isMultiline,
						currentVisitedErrors,
					),
				);

				if (isMultiline) {
					otherLines.push(
						...prefixLines(innerErrorsResult.flat(), options.indentation),
					);
				} else {
					const innerErrorsString = joinNonEmpty(
						innerErrorsResult.map((innerErrorResult) => innerErrorResult[0]),
						", ",
					);
					if (innerErrorsString.length > 0) {
						firstLine.push(`(${innerErrorsString})`);
					}
				}
			}

			if (isSuppressedErrorLike(currentError)) {
				if (!options.skipSuppressedError && currentError.error) {
					const suppressedErrorResult = internalFormatError(
						currentError.error,
						{
							...options,
							stackTrace: options.stackTrace === true,
						},
						isMultiline,
						currentVisitedErrors,
					);

					if (isMultiline) {
						otherLines.push(
							...prefixLines(suppressedErrorResult, options.indentation),
						);
					} else {
						firstLine.push(`${suppressedErrorResult[0]}`);
					}
				}

				if (!options.skipSuppressedSuppressed && currentError.suppressed) {
					const suppressedErrorResult = internalFormatError(
						currentError.suppressed,
						{
							...options,
							prefix: "Suppressed",
							stackTrace: options.stackTrace === true,
						},
						isMultiline,
						currentVisitedErrors,
					);

					if (isMultiline) {
						otherLines.push(
							...prefixLines(suppressedErrorResult, options.indentation),
						);
					} else {
						firstLine.push(`(${suppressedErrorResult[0]})`);
					}
				}
			}

			if (!options.skipCause) {
				if (isMultiline && currentError.cause) {
					const causeResult = internalFormatError(
						currentError.cause,
						{
							...options,
							prefix: "Caused by",
							stackTrace: options.stackTrace === true,
						},
						isMultiline,
						currentVisitedErrors,
					);

					otherLines.push(...prefixLines(causeResult, options.indentation));
					break;
				}

				currentError = currentError.cause;
			} else {
				break;
			}
		} else {
			firstLine.push(options.stringifier(currentError));

			break;
		}
	} while (currentError);

	return [
		`${options.prefix ? `${options.prefix}: ` : ""}${joinNonEmpty(firstLine, ": ")}`,
		...otherLines,
	];
}

export declare namespace formatError {
	export var defaultOptions: Required<FormatErrorOptions>;
}

/**
 * Default options for formatError function.
 */
formatError.defaultOptions = FORMAT_ERROR_DEFAULT_OPTIONS;
