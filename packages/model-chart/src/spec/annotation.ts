import { Value } from "@ac-kit/model-dataset";

/**
 * A reference mark that comes from the caller rather than from the data: a
 * budget line, a target band, a highlighted point, a labelled event.
 *
 * Every real chart eventually needs "the threshold is here", and expressing it
 * as a second data frame would misrepresent an assertion as an observation.
 */
export type AnnotationSpec =
	| { kind: "line"; channel: "x" | "y"; at: Value; label?: string }
	| {
			kind: "band";
			channel: "x" | "y";
			from: Value;
			to: Value;
			label?: string;
	  }
	| { kind: "point"; x: Value; y: Value; label?: string }
	| { kind: "text"; x: Value; y: Value; text: string };
