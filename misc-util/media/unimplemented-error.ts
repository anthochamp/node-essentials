/**
 * Error indicating that a feature is not implemented.
 *
 * Use this error to indicate that a particular feature or functionality is
 * not yet implemented in the codebase.
 *
 * Usage example:
 * ```ts
 * switch (type) {
 *  case "A":
 * 	  // Handle type A
 * 	  break;
 *  default:
 * 	  throw new UnimplementedError("type ${type}`);
 * }
 * ```
 */
export class UnimplementedError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);

		this.name = "UnimplementedError";
	}
}
