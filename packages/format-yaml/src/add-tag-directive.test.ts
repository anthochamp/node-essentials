import { describe, expect, it } from "vitest";

import { addYamlTagDirective } from "./add-tag-directive.js";

const TAG_HANDLE = "!abc!";
const TAG_PREFIX = "tag:example.com,2024:";
const TAG_DIRECTIVE_LINE = `%TAG ${TAG_HANDLE} ${TAG_PREFIX}\n`;

const DIRECTIVES = "%YAML 1.2\n%TAG !foo! tag:example.com,2025:\n";
const DIRECTIVES_WITH_PREFIX = `${DIRECTIVES}%TAG !foo! ${TAG_PREFIX}\n`;
const DIRECTIVES_WITH_HANDLE = `${DIRECTIVES}%TAG ${TAG_HANDLE} tag:example.com,2026:\n`;

describe("addYamlTagDirective", () => {
	describe("single document", () => {
		it("adds the handle with no directives, no doc-start and no doc-end", () => {
			const source = `key: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n${source}`,
			);
		});

		it("adds the handle with no directives, no doc-start and a doc-end", () => {
			const source = `key: value\n...`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n${source}`,
			);
		});

		it("adds the handle with no directives, a doc-start and no doc-end", () => {
			const source = `---\nkey: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}${source}`,
			);
		});

		it("adds the handle with no directives, a doc-start and a doc-end", () => {
			const source = `---\nkey: value\n...`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}${source}`,
			);
		});

		it("joins an existing directive block with no doc-end", () => {
			const source = `${DIRECTIVES}---\nkey: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\nkey: value`,
			);
		});

		it("joins an existing directive block with a doc-end", () => {
			const source = `${DIRECTIVES}---\nkey: value\n...`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\nkey: value\n...`,
			);
		});

		it("leaves a document already declaring the handle alone", () => {
			const source = `${DIRECTIVES_WITH_HANDLE}---\nkey: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(source);
		});

		it("leaves a document already declaring the prefix alone", () => {
			const source = `${DIRECTIVES_WITH_PREFIX}---\nkey: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(source);
		});
	});

	describe("multiple documents", () => {
		it("adds an end marker before the second document's directive", () => {
			const source = `keyA: valueA\n---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("keeps an explicit end marker where the source already has one", () => {
			const source = `keyA: valueA\n...\n---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("joins the second document's own directive block", () => {
			const source = `keyA: valueA\n...\n${DIRECTIVES}---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("patches both documents when each carries directives", () => {
			const source = `${DIRECTIVES}---\nkeyA: valueA\n...\n${DIRECTIVES}---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("patches only the document missing the handle", () => {
			const source = `keyA: valueA\n...\n${DIRECTIVES_WITH_HANDLE}---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${DIRECTIVES_WITH_HANDLE}---\nkeyB: valueB`,
			);
		});

		it("patches only the document missing the prefix", () => {
			const source = `${DIRECTIVES_WITH_PREFIX}---\nkeyA: valueA\n---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${DIRECTIVES_WITH_PREFIX}---\nkeyA: valueA\n...\n${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("leaves both documents alone when both declare the handle", () => {
			const source = `${DIRECTIVES_WITH_HANDLE}---\nkeyA: valueA\n...\n${DIRECTIVES_WITH_HANDLE}---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(source);
		});

		it("leaves both documents alone when both declare the prefix", () => {
			const source = `${DIRECTIVES_WITH_PREFIX}---\nkeyA: valueA\n...\n${DIRECTIVES_WITH_PREFIX}---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(source);
		});
	});

	describe("edge cases", () => {
		it("turns empty source into one empty document", () => {
			expect(addYamlTagDirective("", TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n`,
			);
		});

		it("handles source that is only a doc-end", () => {
			expect(addYamlTagDirective("...", TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n...`,
			);
		});

		it("handles source that is only a doc-start", () => {
			expect(addYamlTagDirective("---", TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---`,
			);
		});

		it("handles a doc-start preceded by directives only", () => {
			expect(
				addYamlTagDirective("%YAML 1.2\n---", TAG_HANDLE, TAG_PREFIX),
			).toBe(`%YAML 1.2\n${TAG_DIRECTIVE_LINE}---`);
		});

		it("handles a doc-start followed by a doc-end", () => {
			expect(addYamlTagDirective("---\n...", TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n...`,
			);
		});

		it("handles directives, doc-start and doc-end with no content", () => {
			const source = `${DIRECTIVES}---\n...`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\n...`,
			);
		});

		it("needs no extra end marker between consecutive doc-start markers", () => {
			const source = `---\n---\nkey: value`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n${TAG_DIRECTIVE_LINE}---\nkey: value`,
			);
		});

		it("handles consecutive doc-end markers", () => {
			const source = `keyA: valueA\n...\n...\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${TAG_DIRECTIVE_LINE}---\n...\n${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("handles an empty last document", () => {
			const source = `keyA: valueA\n---\n`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n...\n${TAG_DIRECTIVE_LINE}---\n`,
			);
		});

		it("handles an empty first document", () => {
			const source = `...\n---\nkeyB: valueB`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`${TAG_DIRECTIVE_LINE}---\n...\n${TAG_DIRECTIVE_LINE}---\nkeyB: valueB`,
			);
		});

		it("handles blank lines around the document boundaries", () => {
			const source = `\n\nkeyA: valueA\n\n...\n\n${DIRECTIVES}---\n\nkeyB: valueB\n\n`;

			expect(addYamlTagDirective(source, TAG_HANDLE, TAG_PREFIX)).toBe(
				`\n\n${TAG_DIRECTIVE_LINE}---\nkeyA: valueA\n\n...\n\n${DIRECTIVES}${TAG_DIRECTIVE_LINE}---\n\nkeyB: valueB\n\n`,
			);
		});
	});
});
