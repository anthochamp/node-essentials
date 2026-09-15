/**
 * Import module at runtime with custom resolve paths.
 *
 * If used, the resolve paths will be used instead of the default node.js ones,
 * except for the GLOBAL_FOLDERS like $HOME/.node_modules, which are always
 * included.
 *
 * @param id The module to load
 * @param resolvePaths The paths to use to resolve the module
 * @returns The loaded module
 */
export async function importModule<T>(
	id: string,
	resolvePaths?: string[],
): Promise<T> {
	if (resolvePaths && resolvePaths.length > 0) {
		id = require.resolve(id, { paths: resolvePaths });
	}

	return import(id);
}
