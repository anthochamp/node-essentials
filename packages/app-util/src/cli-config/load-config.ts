import * as path from "node:path";
import { deepMerge, defaults } from "@ac-essentials/misc-util";
import { cosmiconfig } from "cosmiconfig";
import type { PartialDeep } from "type-fest";
import {
	type ExtendableConfig,
	type ExtendableConfigParser,
	type ResolveExtendableConfigOptions,
	resolveExtendableConfig,
} from "./extendable-config/resolve-extendable-config.js";

/**
 * Options for loading CLI configuration.
 */
export type LoadConfigOptions = {
	/**
	 * Options for resolving "extends" field in the configuration.
	 */
	resolveExtendsOptions?: ResolveExtendableConfigOptions;
};

const DEFAULT_LOAD_CONFIG_OPTIONS: Required<LoadConfigOptions> = {
	resolveExtendsOptions: {},
};

/**
 * Load a CLI configuration file using cosmiconfig, supporting "extends" field.
 *
 * @param configId The configuration ID (name) to search for.
 * @param configParser A parser to validate/transform the config object.
 * @param defaultConfig Default configuration values.
 * @param options Optional settings for loading and resolving the config.
 * @returns The resolved configuration object without the "extends" field.
 */
export async function loadCliConfig<T extends ExtendableConfig>(
	configId: string,
	configParser: ExtendableConfigParser,
	defaultConfig: PartialDeep<T>,
	options?: LoadConfigOptions,
): Promise<Omit<T, "extends">> {
	const effectiveOptions = defaults(options, DEFAULT_LOAD_CONFIG_OPTIONS);

	const searchResult = await cosmiconfig(configId).search();
	if (!searchResult) {
		throw new Error(`no configuration found`);
	}

	return resolveExtendableConfig(
		deepMerge(defaultConfig, searchResult.config, { cloneSource: true }),
		path.dirname(searchResult.filepath),
		configParser,
		configId,
		effectiveOptions.resolveExtendsOptions,
	);
}
