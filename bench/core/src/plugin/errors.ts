import type { MeasureId } from "../common/measure-data.js";

/**
 * Thrown by an plugin's `parseCaseResult`/`parseConditionResult` when a value
 * that crossed the process/plugin boundary does not match the measure's
 * expected shape — e.g. a case result from a different measure.
 */
export class MeasureResultValidationError extends Error {
	constructor(
		public readonly measureId: MeasureId,
		message: string,
	) {
		super(`${measureId}: ${message}`);
		this.name = "MeasureResultValidationError";
	}
}
