/**
 * Escapes any characters in a path segment that are not allowed in file or
 * directory names on POSIX-compliant systems.
 *
 * @param str The path segment to escape
 * @returns The escaped path segment
 */
export function escapePosixPath(str: string, replacement = "_"): string {
	if (str === "." || str === "..") {
		str = `_${str}`;
	}

	// eslint-disable-next-line no-control-regex
	return str.replace(/[/\x00]/g, replacement).substring(0, 255);
}
