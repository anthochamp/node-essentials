import { resolveModule } from "@ac-essentials/misc-util";

/**
 * @internal
 *
 * Resolve the value of an "extends" property in a configuration file.
 *
 * Rules:
 * 1) If the value starts with a @, it is a scoped package. If it does not contain
 *  a / after the scope, add /<configId>-config. Then check if the package is
 * resolvable. If not, return null.
 * 2) If the value does not start with a @,
 * - First try to resolve @<configId>/config-<value>.
 * - If that fails, try to resolve <configId>-config-<value> (old style).
 * - If that fails, try to resolve <value> as is.
 * - If all attempts fail, return null.
 *
 * @param value The "extends"-property value to resolve.
 * @param configId The configuration ID (e.g. "eslint", "babel", etc.).
 * @param searchPaths The paths to use for module resolution.
 * @returns The resolve entry name and the resolved module name, or null if not found.
 */
export function resolveExtendsValue(
	value: string,
	configId: string,
	searchPaths?: string[],
): { id: string; path: string } | null {
	let path: string | null;

	if (value[0] === "@") {
		if (!value.includes("/")) {
			value += `/${configId}-config`;
		}

		path = resolveModule(value, searchPaths);
		if (path) {
			return { id: value, path };
		}

		return null;
	}

	const officialMissingPart = `@${configId}/config`;
	let testName = `${officialMissingPart}-${value}`;

	path = resolveModule(testName, searchPaths);
	if (path) {
		return { id: testName, path };
	}

	const oldStyleOfficialMissingPart = `${configId}-config`;
	if (!value.startsWith(oldStyleOfficialMissingPart)) {
		testName = `${oldStyleOfficialMissingPart}-${value}`;

		path = resolveModule(testName, searchPaths);
		if (path) {
			return { id: testName, path };
		}
	}

	path = resolveModule(value, searchPaths);
	if (path) {
		return { id: value, path };
	}

	return null;
}
