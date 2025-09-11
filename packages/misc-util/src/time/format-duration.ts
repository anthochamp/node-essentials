import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "../constants.js";

/**
 * Formats a duration given in milliseconds into a human-readable string.
 *
 * Examples:
 * - `formatDuration(500)` returns `"500ms"`
 * - `formatDuration(1500)` returns `"1s 500ms"`
 * - `formatDuration(65000)` returns `"1m 5s"`
 * - `formatDuration(3665000)` returns `"1h 1m"`
 * - `formatDuration(0.5)` returns `"500µs"`
 * - `formatDuration(-1500)` returns `"-1s 500ms"`
 *
 * @param durationMs Duration in milliseconds
 * @returns A human-readable string representing the duration
 */
export function formatDuration(durationMs: number): string {
	if (durationMs < 0) {
		return `-${formatDuration(-durationMs)}`;
	}
	if (durationMs > 0 && durationMs < 1) {
		return `${Math.round(durationMs * 1000)}µs`;
	}
	if (durationMs < MS_PER_SECOND) {
		return `${Math.round(durationMs)}ms`;
	}
	if (durationMs < MS_PER_MINUTE) {
		const seconds = Math.floor(durationMs / 1000);
		const ms = durationMs % 1000;
		return ms === 0 ? `${seconds}s` : `${seconds}s ${ms}ms`;
	}
	if (durationMs < MS_PER_HOUR) {
		const minutes = Math.floor(durationMs / MS_PER_MINUTE);
		const seconds = Math.floor((durationMs % MS_PER_MINUTE) / MS_PER_SECOND);
		return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
	}
	const hours = Math.floor(durationMs / MS_PER_HOUR);
	const minutes = Math.floor((durationMs % MS_PER_HOUR) / MS_PER_MINUTE);
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
