import type { PlotSpec } from "@ac-kit/model-chart";
import type { DataFrame } from "@ac-kit/model-dataset";

/**
 * A control the reader can move, and the shape of the value it produces.
 *
 * Every parameter carries its own bounds because the renderer has none: the
 * site draws a slider, a terminal would print a prompt, and a test calls `run`
 * directly with a literal. A parameter that only made sense to one of those
 * would tie the example to one medium.
 */
export type NumberParam = {
	kind: "number";
	label: string;
	min: number;
	max: number;
	step: number;
	initial: number;
	/** What moving this control changes, when that is not obvious. */
	hint?: string;
};

export type ChoiceParam<TOption extends string = string> = {
	kind: "choice";
	label: string;
	options: readonly TOption[];
	initial: NoInfer<TOption>;
	hint?: string;
};

export type BooleanParam = {
	kind: "boolean";
	label: string;
	initial: boolean;
	hint?: string;
};

export type ExampleParam = NumberParam | ChoiceParam | BooleanParam;

export type ExampleParams = Readonly<Record<string, ExampleParam>>;

/** The value one control yields, derived from the control's own declaration. */
export type ExampleParamValue<TParam extends ExampleParam> = TParam extends {
	kind: "number";
}
	? number
	: TParam extends { kind: "boolean" }
		? boolean
		: TParam extends ChoiceParam<infer TOption>
			? TOption
			: never;

export type ExampleParamValues<TParams extends ExampleParams> = {
	[TName in keyof TParams]: ExampleParamValue<TParams[TName]>;
};

/**
 * What an example produces, in terms no renderer owns.
 *
 * `plot` and `table` are what a library example yields; `transcript` is what a
 * command-line example yields, and is declared here rather than added later
 * because a renderer switching over this union must be written against the
 * complete set from the start. `table` doubles as the universal fallback for a
 * renderer that cannot draw a given spec.
 */
export type ExampleView =
	| { kind: "plot"; frame: DataFrame; spec: PlotSpec }
	| { kind: "table"; frame: DataFrame }
	| { kind: "transcript"; text: string };

/**
 * A runnable documentation example.
 *
 * `run` must be pure and synchronous: the site calls it on every control
 * change, and a test calls it to pin the output. It receives values already
 * narrowed by {@link ExampleParamValues}, so a `choice` parameter arrives as its
 * own union of options rather than as `string`.
 */
export type Example<TParams extends ExampleParams = ExampleParams> = {
	title: string;
	/** One or two sentences: what the reader is looking at, and why. */
	description: string;
	/**
	 * The sentence this example is evidence for, if it is evidence for one.
	 *
	 * Omitted, the example illustrates typical output. Present, it demonstrates a
	 * measurable assertion the prose makes — an error bound, a growth rate, a
	 * precision cliff — and the site captions it as evidence rather than as an
	 * illustration. The same string names the test that proves it, so a claim
	 * cannot drift away from its proof.
	 */
	claim?: string;
	params: TParams;
	run(values: ExampleParamValues<TParams>): ExampleView;
};

/** The initial value of every control, i.e. what an unattended render shows. */
export function exampleInitialValues<TParams extends ExampleParams>(
	params: TParams,
): ExampleParamValues<TParams> {
	const values: Record<string, number | string | boolean> = {};
	for (const [name, param] of Object.entries(params)) {
		values[name] = param.initial;
	}
	return values as ExampleParamValues<TParams>;
}
