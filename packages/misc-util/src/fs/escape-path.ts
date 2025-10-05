import os from "node:os";

/**
 * Escapes a string to be used as a safe file or directory name.
 *
 * It replaces any characters that are not allowed in file or directory names
 * with an underscore (_). It also ensures that the name does not exceed the
 * maximum length allowed by the operating system (255 characters).
 *
 * On POSIX systems, it replaces / and null characters.
 * On Windows systems, it replaces < > : " / \ | ? * and control characters (0-31).
 * It also avoids reserved names like CON, PRN, AUX, NUL, COM1, LPT1, etc.
 *
 * @see https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names
 * @see https://en.wikipedia.org/wiki/Comparison_of_file_systems#Limits
 *
 * @param str The string to escape
 * @returns The escaped string
 */
export const escapePath: (str: string, replacement?: string) => string =
	os.platform() === "win32" ? escapeWin32Path : escapePosixPath;

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

	// biome-ignore lint/suspicious/noControlCharactersInRegex: intended
	return str.replace(/[/\x00]/g, replacement).substring(0, 255);
}

/**
 * Escapes any characters in a path segment that are not allowed in file or
 * directory names on Windows.
 *
 * @param str The path segment to escape
 * @returns The escaped path segment
 */
export function escapeWin32Path(str: string, replacement = "_"): string {
	if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(str)) {
		str = `${replacement}${str}`;
	}

	return (
		str
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intended
			.replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement)
			.replace(/[ .]+$/, replacement)
			.substring(0, 255)
	);
}
