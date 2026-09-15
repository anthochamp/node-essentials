import { isNodeErrorWithCode } from "../error/node-error.js";

/**
 * Import a module optionally, returning `null` if the module is not found.
 *
 * This is useful for optional peer dependencies, where a module may or may not
 * be installed.
 *
 * `load` must contain a literal `import("specifier")` expression written in the
 * caller's own module: dynamic import specifiers resolve against the file the
 * expression is written in, not the file that happens to invoke `load` at
 * runtime. Passing a specifier string here instead would resolve it against
 * this module's own dependencies, which fails under strict (non-hoisting)
 * package managers whenever the optional dependency belongs to the caller
 * instead.
 *
 * @param load - A thunk containing the `import("specifier")` expression.
 * @returns The imported module, or `null` if the module cannot be found.
 */
export async function optionalImport<T>(
	load: () => Promise<T>,
): Promise<T | null> {
	try {
		return await load();
	} catch (error) {
		if (isNodeErrorWithCode(error, "ERR_MODULE_NOT_FOUND")) {
			return null;
		}
		throw error;
	}
}
