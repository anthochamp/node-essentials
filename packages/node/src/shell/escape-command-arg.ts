import { platform as processPlatform } from "node:process";

import {
	escapePosixShCommandArg,
	escapeWin32CmdCommandArg,
} from "@ac-kit/core";

/**
 * Escape a string to be safely used as a shell argument, using the rules of the
 * current platform.
 *
 * @param expr The string to escape
 * @returns The escaped string
 */
export const escapeCommandArg: (expr: string) => string =
	processPlatform === "win32"
		? escapeWin32CmdCommandArg
		: escapePosixShCommandArg;
