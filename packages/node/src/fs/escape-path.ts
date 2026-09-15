import os from "node:os";

import { escapePosixPath, escapeWin32Path } from "@ac-kit/core";

export type EscapePathFn = (str: string, replacement?: string) => string;

/**
 * Escapes a string to be used as a safe file or directory name.
 *
 * It replaces any characters that are not allowed in file or directory names
 * with an underscore (_). It also ensures that the name does not exceed the
 * maximum length allowed by the operating system (255 characters).
 *
 * On POSIX systems, it replaces / and null characters. On Windows systems, it
 * replaces < > : " / \ | ? * and control characters (0-31). It also avoids
 * reserved names like CON, PRN, AUX, NUL, COM1, LPT1, etc.
 *
 * @param str The string to escape
 * @returns The escaped string
 * @see https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names
 * @see https://en.wikipedia.org/wiki/Comparison_of_file_systems#Limits
 */
export const escapePath: EscapePathFn =
	os.platform() === "win32" ? escapeWin32Path : escapePosixPath;
