# @ac-kit/fixture-util

Shared plumbing for packages whose tests run against a large, externally
published corpus of test vectors.

Such a corpus should not be committed: it is big, it is versioned upstream
already, and every clone would pay for it whether or not it runs those tests.
The alternative is fetching it on demand — which only works if the download is
pinned and checksummed, so a test run is reproducible and a swapped artifact is
detected.

```ts
import { defaultVectorsRoot, fetchArtifact, verifyChecksum } from "@ac-kit/fixture-util";

const root = defaultVectorsRoot(import.meta.url);

const archive = await fetchArtifact(url);
verifyChecksum(archive, expectedSha256, url); // throws on a mismatch
```

Also exposes `extractZip`, `resolveFixtureDir`, `runFixtureSetup` for driving a
whole manifest, and `setupArchiveFixture`/`setupGitSparseFixtureEntry` for the
two acquisition shapes.

Used by `@ac-kit/fixture-crypto` and `@ac-kit/fixture-x509`; each still owns its
own manifest data and domain-specific loaders.

Node only.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/fixture-util/)
for the full reference.
