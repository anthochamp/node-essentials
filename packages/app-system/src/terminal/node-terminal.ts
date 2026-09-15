import { existsSync } from "node:fs";

import type { Terminal } from "@ac-kit/app-terminal";
import { VoidEvent } from "@ac-kit/async";
import {
	CLEAR_SCREEN,
	ColorDepth,
	ENTER_ALT_SCREEN,
	EXIT_ALT_SCREEN,
} from "@ac-kit/format-ansi";

/**
 * Heuristics below match the widely-used `is-unicode-supported`/
 * `supports-hyperlinks` packages' logic — not proprietary, just the standard
 * approach every terminal-capability-detection library converges on. Always
 * false-positive/false-negative prone by nature (a terminal can lie about
 * itself via env vars); `hyperlinks`/`unicode` are advisory, not guaranteed.
 */
function detectUnicodeSupport(env: NodeJS.ProcessEnv): boolean {
	if (process.platform !== "win32") {
		return env.TERM !== "linux";
	}

	return Boolean(
		env.CI ||
		env.WT_SESSION ||
		env.TERMINUS_SUBLIME ||
		env.ConEmuTask === "{cmd::Cmder}" ||
		env.TERM_PROGRAM === "vscode" ||
		env.TERM === "xterm-256color" ||
		env.TERM === "alacritty",
	);
}

const HYPERLINK_TERM_PROGRAMS = new Set([
	"vscode",
	"hyper",
	"wezterm",
	"iterm.app",
]);

function detectHyperlinkSupport(
	interactive: boolean,
	env: NodeJS.ProcessEnv,
): boolean {
	if (env.FORCE_HYPERLINK && env.FORCE_HYPERLINK !== "0") {
		return true;
	}

	if (!interactive || env.CI) {
		return false;
	}

	if (process.platform === "win32") {
		return Boolean(env.WT_SESSION);
	}

	if (env.TERM_PROGRAM) {
		return HYPERLINK_TERM_PROGRAMS.has(env.TERM_PROGRAM.toLowerCase());
	}

	return Boolean(env.VTE_VERSION);
}

// from https://github.com/vercel/detect-agent/blob/main/agents.json (Licensed under Apache 2.0)
function detectAiAgent(env: NodeJS.ProcessEnv, noTty?: boolean): boolean {
	// cursor
	if (env.CURSOR_TRACE_ID) {
		return true;
	}

	// cursor-cli
	if (env.CURSOR_AGENT || env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec") {
		return true;
	}

	// kimi
	if (env.KIMI_PLUGIN_ROOT) {
		return true;
	}

	// grok
	if (env.GROK_PLUGIN_ROOT || env.GROK_PLUGIN_DATA) {
		return true;
	}

	if (env.GEMINI_CLI) {
		return true;
	}

	if (env.CLINE_ACTIVE) {
		return true;
	}

	// codex
	if (
		env.CODEX_SANDBOX ||
		env.CODEX_CI ||
		env.CODEX_THREAD_ID ||
		env.CODEX_SANDBOX_NETWORK_DISABLED
	) {
		return true;
	}

	if (env.ANTIGRAVITY_AGENT || env.ANTIGRAVITY_CLI_ALIAS) {
		return true;
	}

	if (env.AUGMENT_AGENT) {
		return true;
	}

	if (env.OPENCODE_CLIENT || env.OPENCODE) {
		return true;
	}

	if (env.GOOSE_PROVIDER) {
		return true;
	}

	if (env.JUNIE_DATA || env.JUNIE_SHIM_PATH) {
		return true;
	}

	if (env.PATH?.search(/\.pi[\\/]agent/) !== -1) {
		return true;
	}

	if (env.CLAUDE_CODE_IS_COWORK && (env.CLAUDECODE || env.CLAUDE_CODE)) {
		return true;
	}

	if (env.CLAUDECODE || env.CLAUDE_CODE) {
		return true;
	}

	if (env.REPL_ID) {
		return true;
	}

	if (env.COPILOT_MODEL || env.COPILOT_ALLOW_ALL || env.COPILOT_GITHUB_TOKEN) {
		return true;
	}

	if (env.TERM_PROGRAM === "kiro" && noTty) {
		return true;
	}

	if (env.OPENCLAW_SHELL) {
		return true;
	}

	// devin agent detection
	if (existsSync("/opt/.devin")) {
		return true;
	}

	return false;
}

/**
 * The Node adapter for `Terminal` (`@ac-kit/app-terminal`) — reads `stream`'s
 * TTY properties and `process.env`.
 *
 * `columns`/`rows` are getters, not values captured at construction: they must
 * reflect the terminal's current size after a `resize` event fires, not its
 * size when `nodeTerminal` was called.
 */
export function nodeTerminal(stream: NodeJS.WriteStream): Terminal {
	const env = process.env;
	const noTty = !stream.isTTY;
	const resize = new VoidEvent();

	const aiAgent = detectAiAgent(env, noTty);

	const interactive = !noTty && !aiAgent;

	stream.on("resize", () => resize.emit());

	return {
		interactive,
		get columns() {
			return interactive ? stream.columns : 80;
		},
		get rows() {
			return interactive ? stream.rows : 24;
		},
		colorDepth: interactive ? (stream.getColorDepth() as ColorDepth) : 1,
		unicode: !aiAgent && detectUnicodeSupport(env),
		hyperlinks: !aiAgent && detectHyperlinkSupport(interactive, env),
		resize,
		// Spreading a plain method-only object here is safe; spreading `terminal`
		// itself (built separately) would have flattened the getters above into
		// frozen snapshot values instead.
		...(interactive
			? {
					enterAltScreen: () => {
						stream.write(ENTER_ALT_SCREEN);
					},
					exitAltScreen: () => {
						stream.write(EXIT_ALT_SCREEN);
					},
					clear: () => {
						stream.write(CLEAR_SCREEN);
					},
				}
			: {}),
	};
}
