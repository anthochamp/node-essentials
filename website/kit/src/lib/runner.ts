import type { ExampleParam, ExampleParams, ExampleView } from "examples";
import { exampleInitialValues } from "examples";

import { getExample } from "./examples.js";
import { renderPlotSpec, UndrawableSpecError } from "./plot/render.js";
import { renderFrameTable } from "./plot/table.js";

type ParamValue = number | string | boolean;

/** Narrower than this and the axes have no room for labels. */
const MIN_PLOT_WIDTH = 320;

/** Below this, a width change is scrollbar noise rather than a new layout. */
const RESIZE_THRESHOLD = 24;

/** Long enough for a drag to settle before paying for a redraw. */
const RESIZE_DEBOUNCE_MS = 150;

function createControl(
	name: string,
	param: ExampleParam,
	onChange: (value: ParamValue) => void,
): HTMLElement {
	const wrapper = document.createElement("label");
	wrapper.className = "example-control";

	const caption = document.createElement("span");
	caption.className = "example-control__label";
	caption.textContent = param.label;
	wrapper.append(caption);

	if (param.kind === "choice") {
		const select = document.createElement("select");
		for (const option of param.options) {
			const item = document.createElement("option");
			item.value = option;
			item.textContent = option;
			select.append(item);
		}
		select.value = param.initial;
		select.addEventListener("change", () => {
			onChange(select.value);
		});
		wrapper.append(select);
	} else if (param.kind === "boolean") {
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = param.initial;
		checkbox.addEventListener("change", () => {
			onChange(checkbox.checked);
		});
		wrapper.append(checkbox);
	} else {
		const slider = document.createElement("input");
		slider.type = "range";
		slider.min = String(param.min);
		slider.max = String(param.max);
		slider.step = String(param.step);
		slider.value = String(param.initial);

		const readout = document.createElement("output");
		readout.className = "example-control__value";
		readout.textContent = String(param.initial);

		slider.addEventListener("input", () => {
			readout.textContent = slider.value;
			onChange(Number(slider.value));
		});
		wrapper.append(slider, readout);
	}

	if (param.hint !== undefined) {
		const hint = document.createElement("small");
		hint.className = "example-control__hint";
		hint.textContent = param.hint;
		wrapper.append(hint);
	}

	wrapper.dataset["param"] = name;
	return wrapper;
}

function renderView(view: ExampleView, width: number): Node {
	switch (view.kind) {
		case "plot":
			try {
				return renderPlotSpec(view.frame, view.spec, { width });
			} catch (error) {
				if (!(error instanceof UndrawableSpecError)) {
					throw error;
				}
				// The spec's fallback chain ran out; the frame is still worth showing.
				return renderFrameTable(view.frame);
			}
		case "table":
			return renderFrameTable(view.frame);
		case "transcript": {
			const pre = document.createElement("pre");
			pre.textContent = view.text;
			return pre;
		}
	}
}

function mount(host: HTMLElement): void {
	const id = host.dataset["example"];
	if (id === undefined) {
		return;
	}

	const { example } = getExample(id);
	const values: Record<string, ParamValue> = {
		...exampleInitialValues(example.params as ExampleParams),
	};

	const controls = document.createElement("div");
	controls.className = "example-controls";

	const output = document.createElement("div");
	output.className = "example-output";

	let lastWidth = 0;

	const draw = (width: number): void => {
		lastWidth = width;
		// Hold the height across the swap: letting it collapse to zero can toggle
		// the page scrollbar, which changes the width, which asks for another
		// redraw — the loop this reservation exists to break.
		const previousHeight = output.getBoundingClientRect().height;
		if (previousHeight > 0) {
			output.style.minHeight = `${previousHeight}px`;
		}

		output.replaceChildren();
		try {
			output.append(renderView(example.run(values), width));
		} catch (error) {
			const failure = document.createElement("p");
			failure.className = "example-output__error";
			failure.textContent = `This example failed to run: ${
				error instanceof Error ? error.message : String(error)
			}`;
			output.append(failure);
		}

		output.style.minHeight = "";
	};

	const redraw = (): void => {
		draw(Math.max(Math.round(output.clientWidth), MIN_PLOT_WIDTH));
	};

	for (const [name, param] of Object.entries(example.params)) {
		controls.append(
			createControl(name, param, (value) => {
				values[name] = value;
				redraw();
			}),
		);
	}

	host.replaceChildren(controls, output);
	redraw();

	// A plot is sized in pixels, so a resized column needs a new one. Drawing
	// resizes the very element being watched, so the observer is detached across
	// the redraw rather than merely filtered: a threshold alone still lets a
	// scrollbar appearing and disappearing drive the loop forever.
	let timer: ReturnType<typeof setTimeout> | undefined;
	const observer = new ResizeObserver((entries) => {
		const width = Math.round(entries[0]?.contentRect.width ?? 0);
		if (Math.abs(width - lastWidth) < RESIZE_THRESHOLD) {
			return;
		}
		clearTimeout(timer);
		timer = setTimeout(() => {
			observer.disconnect();
			redraw();
			// Reattached a frame later, once this redraw's own layout has settled.
			requestAnimationFrame(() => {
				observer.observe(output);
			});
		}, RESIZE_DEBOUNCE_MS);
	});
	observer.observe(output);
}

/** Hydrates every example placeholder on the page. */
export function mountExamples(): void {
	for (const host of document.querySelectorAll<HTMLElement>("[data-example]")) {
		mount(host);
	}
}
