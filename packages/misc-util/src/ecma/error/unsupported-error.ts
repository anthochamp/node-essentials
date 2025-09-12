/**
 * Error indicating that a feature is not supported.
 *
 * Use this error to indicate that a particular feature or functionality is
 * not supported in the current environment or context.
 */
export class UnsupportedError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);

		this.name = "UnsupportedError";
	}
}
