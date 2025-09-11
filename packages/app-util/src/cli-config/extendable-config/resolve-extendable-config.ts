import * as path from "node:path";
import {
	deepClone,
	deepMergeInplace,
	defaults,
} from "@ac-essentials/misc-util";
import { resolveExtendsValue } from "./resolve-extends-value.js";

export type ExtendableConfig = {
	extends?: string | string[];

	[key: string]: unknown;
};

export type ExtendableConfigParser = (data: unknown) => ExtendableConfig;

export type ResolveExtendableConfigOptions = {
	moduleFunctionCallArgs?: unknown[];

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
