import { platform as processPlatform } from "node:process";

import { escapePosixShCommand, escapeWin32CmdCommand } from "@ac-kit/core";

/**
 * Escapes any characters in a string that might be used to trick a shell
 * command into executing arbitrary commands, using the rules of the current
 * platform.
 *
 * @param cmd The command to escape
 * @returns The escaped command
 */
export const escapeCommand: (cmd: string) => string =
	processPlatform === "win32" ? escapeWin32CmdCommand : escapePosixShCommand;
