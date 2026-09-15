import { runFixtureSetup, setupArchiveFixture } from "@ac-kit/fixture-util";

import { FIXTURE_MANIFEST } from "./manifest.js";
import { VECTORS_ROOT } from "./paths.js";

await runFixtureSetup(FIXTURE_MANIFEST, VECTORS_ROOT, setupArchiveFixture);
