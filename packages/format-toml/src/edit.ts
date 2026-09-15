import {
	PropertyPath,
	TextEdit,
	applyTextEdits,
	setAtPath,
} from "@ac-kit/core";
import toml from "smol-toml";

type TomlPrintOptions = NonNullable<Parameters<typeof toml.stringify>[1]>;

/** Returns a full-replace {@link TextEdit} after setting `value` at `path`. */
export function createTomlEdits(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: TomlPrintOptions,
): TextEdit[] {
	const root = toml.parse(source) as Record<string, unknown>;
	setAtPath(root, path, value);
	const newSource = toml.stringify(root, options);
	return [{ offset: 0, length: source.length, content: newSource }];
}

/** Sets `value` at `path` in a TOML string and returns the updated source. */
export function editToml(
	source: string,
	path: PropertyPath,
	value: unknown,
	options?: TomlPrintOptions,
): string {
	return applyTextEdits(source, createTomlEdits(source, path, value, options));
}
