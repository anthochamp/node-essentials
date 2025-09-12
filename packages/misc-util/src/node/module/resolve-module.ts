import { isNodeErrorWithCode } from "../error/node-error.js";

/**
 * Resolve a module id to its full path.
 *
 * If defined, the resolve paths will be used instead of the default node.js
 * ones, except for the GLOBAL_FOLDERS like $HOME/.node_modules, which are
 * always included.
 *
 * @param id Module identifier
 * @param resolvePaths Optional paths to use to resolve the module
 * @returns The resolved module path, or null if it cannot be found.
 */
export function resolveModule(
	id: string,
	resolvePaths?: string[],
): string | null {
	let result: string | null;

	try {
		result = require.resolve(id, { paths: resolvePaths });
	} catch (error) {
		if (!isNodeErrorWithCode(error, "MODULE_NOT_FOUND")) {
			throw error;
		}

		result = null;
	}

	return result;
}
