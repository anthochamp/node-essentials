import * as path from "node:path";
import {
	deepClone,
	deepMergeInplace,
	defaults,
} from "@ac-essentials/misc-util";
import type { UnknownRecord } from "type-fest";
import { resolveExtendsValue } from "./resolve-extends-value.js";

/**
 * A configuration object that can extend other configurations via the "extends" property.
 *
 * The "extends" property can be a string or an array of strings, each representing
 * a module to extend from. The modules will be resolved and merged into the current
 * configuration.
 *
 * Additional properties can be defined as needed.
 */
export type ExtendableConfig = UnknownRecord & {
	/**
	 * A module or an array of modules to extend from.
	 *
	 * Each module can be:
	 * - A package name (e.g. "my-config-package").
	 * - A scoped package name (e.g. "@my-scope/my-config-package").
	 * - A relative or absolute path to a configuration file.
	 *
	 * The modules will be resolved and merged in the order they are listed.
	 */
	extends?: string | string[];
};

/**
 * A parser function to validate and transform an extendable configuration object.
 *
 * This function should take the raw configuration data (e.g. from a JSON file or module)
 * and return a valid `ExtendableConfig` object. It can also throw an error if the data
 * is invalid.
 *
 * @param data The raw configuration data to parse.
 * @returns The parsed and validated `ExtendableConfig` object.
 */
export type ExtendableConfigParser = (data: unknown) => ExtendableConfig;

/**
 * Options for resolving an extendable configuration.
 */
export type ResolveExtendableConfigOptions = {
	/**
	 * Arguments to pass to configuration modules that export a function.
	 *
	 * If a configuration module exports a function, it will be called with these arguments
	 * to obtain the configuration object.
	 *
	 * Default is an empty array (no arguments).
	 */
	moduleFunctionCallArgs?: unknown[];

	/**
	 * A callback function that is called when a circular dependency is detected.
	 */
	onCircularDependency?:
		| ((moduleId: string, modulePath: string, configPath: string) => void)
		| null;
};

const RESOLVE_EXTENDABLE_CONFIG_DEFAULT_OPTIONS: Required<ResolveExtendableConfigOptions> =
	{
		moduleFunctionCallArgs: [],
		onCircularDependency: null,
	};

/**
 * Resolve an extendable configuration (with "extends"-property).
 *
 * @param configData The configuration data to resolve.
 * @param configPath The path of the configuration file (used for resolving relative paths).
 * @param configParser The parser function to parse configuration modules.
 * @param configId The configuration ID (e.g. "eslint", "babel", etc.).
 * @param options The options for resolving the configuration.
 * @returns The resolved configuration data, without the "extends"-property.
 */
export async function resolveExtendableConfig<T extends ExtendableConfig>(
	configData: T,
	configPath: string,
	configParser: ExtendableConfigParser,
	configId: string,
	options?: ResolveExtendableConfigOptions,
): Promise<Omit<T, "extends">> {
	const effectiveOptions = defaults(
		options,
		RESOLVE_EXTENDABLE_CONFIG_DEFAULT_OPTIONS,
	);

	return internalResolveExtendableConfig(
		configData,
		configPath,
		configParser,
		configId,
		effectiveOptions,
		new Set<string>(),
		new Set<string>(),
	);
}

/**
 * @internal
 *
 * Internal function to recursively resolve an extendable configuration.
 *
 * @param configData The configuration data to resolve.
 * @param configPath The path of the configuration file (used for resolving relative paths).
 * @param configParser The parser function to parse configuration modules.
 * @param configId The configuration ID (e.g. "eslint", "babel", etc.).
 * @param options The options for resolving the configuration.
 * @param globalList A set of already resolved module paths (to avoid duplicates).
 * @param branchList A set of module paths in the current resolution branch (to detect circular dependencies).
 * @returns The resolved configuration data, without the "extends"-property.
 */
async function internalResolveExtendableConfig<T extends ExtendableConfig>(
	configData: T,
	configPath: string,
	configParser: ExtendableConfigParser,
	configId: string,
	options: Required<ResolveExtendableConfigOptions>,
	globalList: Set<string>,
	branchList: Set<string>,
): Promise<Omit<T, "extends">> {
	const { extends: extendsData, ...restConfig } = configData;

	const extendsValues =
		typeof extendsData === "string" ? [extendsData] : (extendsData ?? []);

	const finalConfig = deepClone(restConfig);

	for (const extendsValue of extendsValues) {
		let moduleId: string;
		let modulePath: string;
		try {
			const result = resolveExtendsValue(extendsValue, configId, [configPath]);
			if (!result) {
				throw new Error("not found");
			}

			moduleId = result.id;
			modulePath = result.path;
		} catch (error) {
			throw new Error(
				`resolve module "${extendsValue}" (referenced from "${configPath}")`,
				{ cause: error },
			);
		}

		if (branchList.has(modulePath)) {
			options.onCircularDependency?.(moduleId, modulePath, configPath);
			continue;
		}

		if (globalList.has(modulePath)) {
			continue;
		}
		globalList.add(modulePath);

		const module = await import(modulePath);

		let moduleData: unknown;
		if (typeof module.default === "function") {
			moduleData = module.default(...options.moduleFunctionCallArgs);
		} else if (typeof module === "function") {
			moduleData = module(...options.moduleFunctionCallArgs);
		} else {
			moduleData = module.default || module;
		}

		let moduleConfig: ExtendableConfig;
		try {
			moduleConfig = configParser(moduleData);
		} catch (error) {
			throw new Error(
				`validate config from module "${moduleId}" (referenced from "${configPath}")`,
				{ cause: error },
			);
		}

		const resolvedConfig = await internalResolveExtendableConfig(
			moduleConfig,
			path.dirname(modulePath),
			configParser,
			configId,
			options,
			globalList,
			new Set([...branchList, modulePath]),
		);

		deepMergeInplace(finalConfig, resolvedConfig, {
			cloneSource: true,
			arrayMergeMode: "spread",
		});
	}

	return finalConfig;
}
