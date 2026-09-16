/**
 * Read back the value of a POSIX shell word, undoing single quotes, double
 * quotes and backslash escapes.
 *
 * The inverse of `escapePosixShCommandArg`, and of any other spelling of the
 * same word: a shell word concatenates quoted and unquoted segments freely, so
 * `'it'\''s'` and `it\'s` both carry `it's`.
 *
 * Expansion is not performed. `$HOME` and `` `id` `` are returned verbatim,
 * which is what the single-quoted form means and the only reading available
 * without a shell to run.
 *
 * @param word The word to read.
 * @returns The value it carries.
 */
export function unquotePosixShWord(word: string): string {
	let result = "";
	let index = 0;

	while (index < word.length) {
		const char = word[index];

		if (char === "'") {
			const end = word.indexOf("'", index + 1);
			if (end === -1) {
				// Unterminated: take the rest rather than reject, so a hand-written
				// line missing its closing quote still yields its value.
				result += word.slice(index + 1);
				break;
			}

			result += word.slice(index + 1, end);
			index = end + 1;
		} else if (char === '"') {
			index++;
			while (index < word.length && word[index] !== '"') {
				// Inside double quotes a backslash only escapes these four.
				if (
					word[index] === "\\" &&
					index + 1 < word.length &&
					['"', "\\", "$", "`"].includes(word[index + 1] as string)
				) {
					index++;
				}

				result += word[index];
				index++;
			}
			index++;
		} else if (char === "\\" && index + 1 < word.length) {
			result += word[index + 1];
			index += 2;
		} else {
			result += char;
			index++;
		}
	}

	return result;
}
