/** Whether `value` is finite and strictly greater than zero. */
export function isFinitePositive(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}
