import {
	runFixtureSetup,
	setupArchiveFixture,
	setupGitSparseFixtureEntry,
} from "@ac-kit/fixture-util";

import type { FixtureEntry } from "./manifest.js";
import { FIXTURE_MANIFEST } from "./manifest.js";
import { VECTORS_ROOT } from "./paths.js";

function setupOne(entry: FixtureEntry, destination: string): Promise<void> {
	return entry.kind === "archive"
		? setupArchiveFixture(entry, destination)
		: setupGitSparseFixtureEntry(entry, destination);
}

await runFixtureSetup(FIXTURE_MANIFEST, VECTORS_ROOT, setupOne);
