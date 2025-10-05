declare global {
	interface RegExpConstructor {
		/**
		 * Escapes special characters in a string to be used in a regular expression.
		 *
		 * @param str The input string to escape.
		 * @return The escaped string safe for use in a regular expression.
		 *
		 * @see https://github.com/microsoft/TypeScript/issues/61321
		 */
		escape(str: string): string;
	}
}
