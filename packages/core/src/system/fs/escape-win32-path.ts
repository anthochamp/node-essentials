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
			// eslint-disable-next-line no-control-regex
			.replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement)
			.replace(/[ .]+$/, replacement)
			.substring(0, 255)
	);
}
