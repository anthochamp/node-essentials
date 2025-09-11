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

export type LoadConfigOptions = {
	resolveExtendsOptions?: ResolveExtendableConfigOptions;
};

const DEFAULT_LOAD_CONFIG_OPTIONS: Required<LoadConfigOptions> = {
	resolveExtendsOptions: {},
};

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
