/**
 * Error thrown when a path resolves outside the root directory it was required
 * to stay inside.
 *
 * Carries the two resolved absolute paths rather than the caller's originals,
 * because the originals are what looked innocent — `../../../etc/passwd` says
 * nothing about where it landed.
 */
export class PathEscapeError extends Error {
	constructor(
		/** The resolved root the path was required to stay inside. */
		readonly root: string,
		/** The resolved path that fell outside it. */
		readonly path: string,
		options?: ErrorOptions,
	) {
		super(`Path "${path}" is outside "${root}"`, options);

		this.name = "PathEscapeError";
	}
}
