import type { Terminal } from "@ac-kit/app-terminal";

import type { ReportEvent } from "./events.js";
import type { ScopeTracker } from "./util/scope-tracker.js";

export type FormatContext = {
	/**
	 * The scope tracker, which can be used to query the current open scopes and
	 * their attributes. This is useful for formatters that want to include scope
	 * information in their output. For example, a formatter might want to include
	 * the name of the current scope in its output. The scope tracker is updated
	 * in real-time as events are written to the sink, so it always reflects the
	 * current state of the run. Note that the scope tracker is not thread-safe,
	 * so formatters should not modify it.
	 */
	readonly scopes: ScopeTracker;

	/**
	 * The terminal the sink is writing to, if any. This is useful for formatters
	 * that want to adapt their output to the terminal's capabilities, e.g. using
	 * colors or other ANSI escape sequences.
	 */
	readonly terminal?: Terminal;
};

/**
 * Renders one event to a chunk of output, or `null` to render nothing for it.
 *
 * The formatter is called for every event, in write order, and may be called
 * multiple times for the same scope (e.g. `"scope-progress"` events). It may
 * also be called for events that are never written to the sink, e.g. when a
 * `NoRepeatProxy` or `TailWindowProxy` discards them.
 */
export type Formatter<TData> = (
	event: ReportEvent<TData>,
	context: FormatContext,
) => string | null;
