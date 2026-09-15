import type { LiveRegion, Terminal } from "@ac-kit/app-terminal";
import {
	createLiveRegion,
	isRedrawable,
	liveRegionHeight,
} from "@ac-kit/app-terminal";
import { LossyQueue } from "@ac-kit/data";

import type { ReportEvent, ReportScopeId } from "../events.js";
import type { FormatContext, Formatter } from "../formatter.js";
import type { ISink } from "../sink.js";
import { ScopeTracker } from "../util/scope-tracker.js";
import { WritableStreamSink } from "./writable-stream-sink.js";

export type LiveRegionSinkOptions<TData> = {
	formatter: Formatter<TData>;
	terminal: Terminal;

	/** Recent output lines kept and shown per open scope. Default `5`. */
	tailLines?: number;

	/** Whether a completed scope's line is flushed to scrollback. Default `true`. */
	showCompleted?: boolean;

	/** Minimum time between redraws. Default `50`. */
	minRedrawIntervalMs?: number;
};

type OpenScopeState<TData> = {
	/**
	 * The last scope-start/scope-progress event observed, re-rendered on every
	 * redraw.
	 */
	latestEvent: ReportEvent<TData>;
	tail: LossyQueue<string> | null;
};

/**
 * A re-rendered region at the bottom of the terminal showing every open scope's
 * current line plus a tail of its recent output — BuildKit's vertex display and
 * indicatif's `MultiProgress` generalised. A completed scope's line is flushed
 * above the region as permanent scrollback; the region itself is erased and
 * redrawn in place via ANSI cursor movement, clamped to `terminal.rows - 1` so
 * it never exceeds the viewport.
 *
 * Degrades to plain sequential {@link WritableStreamSink} behaviour (no ANSI
 * cursor codes) when `terminal.interactive` is `false` — required, not just a
 * fallback: redrawing in place corrupts non-interactive (CI) logs.
 *
 * Overflow heuristic when every open scope's line doesn't fit `terminal.rows -
 * 1`: the oldest (longest-running) scopes are dropped first, keeping the most
 * recently started ones visible; once every visible scope has its one line,
 * remaining budget is spent on tail lines, most-recent scope first.
 *
 * `data` events are formatted and flushed to scrollback unconditionally (not
 * gated by `showCompleted`, which only governs scope completion lines) — a
 * domain payload arriving mid-run is as legitimate a piece of output as a
 * finished scope, and dropping it would make this sink unusable with any
 * formatter that renders `data` (e.g. a benchmark suite's result table).
 * `diagnostic` events are flushed the same way, for the same reason.
 */
export class LiveRegionSink<TData> implements ISink<TData> {
	private readonly fallback: WritableStreamSink<TData> | null;
	private readonly formatter: Formatter<TData>;
	private readonly terminal: Terminal;
	private readonly tailLines: number;
	private readonly showCompleted: boolean;
	private readonly minRedrawIntervalMs: number;
	private readonly writer: WritableStreamDefaultWriter<string> | null;
	private readonly unsubscribeResize: (() => void) | null;

	private readonly scopeTracker = new ScopeTracker();
	private readonly openOrder: ReportScopeId[] = [];
	private readonly openState = new Map<ReportScopeId, OpenScopeState<TData>>();
	private readonly pendingScrollback: string[] = [];
	private readonly region: LiveRegion;
	private lastRenderAt = 0;
	private pendingRedrawTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		stream: WritableStream<string>,
		options: LiveRegionSinkOptions<TData>,
	) {
		this.formatter = options.formatter;
		this.terminal = options.terminal;
		this.region = createLiveRegion(options.terminal);
		this.tailLines = options.tailLines ?? 5;
		this.showCompleted = options.showCompleted ?? true;
		this.minRedrawIntervalMs = options.minRedrawIntervalMs ?? 50;

		if (!isRedrawable(this.terminal)) {
			this.fallback = new WritableStreamSink<TData>(stream, {
				formatter: this.formatter,
				terminal: this.terminal,
			});
			this.writer = null;
			this.unsubscribeResize = null;
			return;
		}

		this.fallback = null;
		this.writer = stream.getWriter();
		this.unsubscribeResize = this.terminal.resize.subscribe(() => {
			this.clearPendingRedraw();
			void this.redrawNow();
		});
	}

	async write(event: ReportEvent<TData>, signal?: AbortSignal): Promise<void> {
		if (this.fallback) {
			await this.fallback.write(event, signal);
			return;
		}

		this.scopeTracker.observe(event);

		switch (event.kind) {
			case "scope-start": {
				if (event.scopeId === null) {
					break;
				}

				this.openOrder.push(event.scopeId);
				this.openState.set(event.scopeId, {
					latestEvent: event,
					tail:
						this.tailLines > 0
							? new LossyQueue(undefined, {
									capacity: this.tailLines,
									overflowPolicy: "evict",
								})
							: null,
				});
				break;
			}

			case "scope-progress": {
				const state =
					event.scopeId === null
						? undefined
						: this.openState.get(event.scopeId);
				if (state) {
					state.latestEvent = event;
				}
				break;
			}

			case "output": {
				const state =
					event.scopeId === null
						? undefined
						: this.openState.get(event.scopeId);
				if (state?.tail) {
					const line = this.formatter(event, this.context());
					if (line !== null) {
						state.tail.enqueue(line);
					}
				}
				break;
			}

			case "scope-end": {
				const index =
					event.scopeId === null ? -1 : this.openOrder.indexOf(event.scopeId);
				if (index !== -1) {
					this.openOrder.splice(index, 1);
				}
				if (event.scopeId !== null) {
					this.openState.delete(event.scopeId);
				}

				if (this.showCompleted) {
					const line = this.formatter(event, this.context());
					if (line !== null) {
						this.pendingScrollback.push(line);
					}
				}
				break;
			}

			case "data":
			case "diagnostic": {
				const line = this.formatter(event, this.context());
				if (line !== null) {
					this.pendingScrollback.push(line);
				}
				break;
			}

			default:
				break;
		}

		if (Date.now() - this.lastRenderAt >= this.minRedrawIntervalMs) {
			this.clearPendingRedraw();
			await this.redrawNow(signal);
		} else {
			this.schedulePendingRedraw();
		}
	}

	async flush(signal?: AbortSignal): Promise<void> {
		if (this.fallback) {
			await this.fallback.flush();
			return;
		}

		this.clearPendingRedraw();
		await this.redrawNow(signal);
		await this.writer?.ready;
	}

	async close(signal?: AbortSignal): Promise<void> {
		if (this.fallback) {
			await this.fallback.close();
			return;
		}

		this.clearPendingRedraw();
		this.unsubscribeResize?.();
		await this.redrawNow(signal);
		await this.writer?.close();
	}

	private context(): FormatContext {
		return { scopes: this.scopeTracker, terminal: this.terminal };
	}

	private schedulePendingRedraw(): void {
		if (this.pendingRedrawTimer !== null) {
			return;
		}

		const delay = Math.max(
			0,
			this.minRedrawIntervalMs - (Date.now() - this.lastRenderAt),
		);
		this.pendingRedrawTimer = setTimeout(() => {
			this.pendingRedrawTimer = null;
			void this.redrawNow();
		}, delay);
	}

	private clearPendingRedraw(): void {
		if (this.pendingRedrawTimer !== null) {
			clearTimeout(this.pendingRedrawTimer);
			this.pendingRedrawTimer = null;
		}
	}

	private buildRegionLines(): string[] {
		const rowBudget = liveRegionHeight(this.terminal);
		if (rowBudget === 0 || this.openOrder.length === 0) {
			return [];
		}

		const visibleIds =
			this.openOrder.length <= rowBudget
				? this.openOrder
				: this.openOrder.slice(this.openOrder.length - rowBudget);

		const context = this.context();
		const headerById = new Map<ReportScopeId, string>();
		for (const id of visibleIds) {
			const state = this.openState.get(id);
			if (state) {
				headerById.set(id, this.formatter(state.latestEvent, context) ?? "");
			}
		}

		let remaining = rowBudget - visibleIds.length;
		const tailById = new Map<ReportScopeId, string[]>();
		for (
			let index = visibleIds.length - 1;
			index >= 0 && remaining > 0;
			index--
		) {
			const id = visibleIds[index]!;
			const state = this.openState.get(id);
			const tail = state?.tail ? [...state.tail] : [];
			const take = Math.min(tail.length, remaining);
			if (take > 0) {
				tailById.set(id, tail.slice(-take));
				remaining -= take;
			}
		}

		const lines: string[] = [];
		for (const id of visibleIds) {
			lines.push(headerById.get(id) ?? "");
			for (const tailLine of tailById.get(id) ?? []) {
				lines.push(tailLine);
			}
		}

		return lines;
	}

	private async redrawNow(signal?: AbortSignal): Promise<void> {
		if (!this.writer) {
			return;
		}

		this.lastRenderAt = Date.now();

		const scrollback = this.pendingScrollback.splice(
			0,
			this.pendingScrollback.length,
		);
		const output = this.region(this.buildRegionLines(), scrollback);

		if (output.length > 0) {
			signal?.throwIfAborted();
			await this.writer.write(output);
		}
	}
}
