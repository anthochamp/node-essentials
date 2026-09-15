# @ac-kit/integration-test-util

Test helpers that drive and probe **external** services: starting a Docker
container for a suite, and checking that a TCP or TLS endpoint is up and
speaking the protocol you expect.

```ts
import { initDockerSuite, isTcpPortOpen } from "@ac-kit/integration-test-util";

// Registers beforeAll/afterAll/afterEach hooks covering the whole container
// lifecycle: build the image, stop and remove the container between tests.
const suite = initDockerSuite("./fixtures/postfix");

await isTcpPortOpen(25, "127.0.0.1");
```

Also exposes `tryTcpConnectAndReadBanner` and `tryTlsConnectAndReadBanner`, for
waiting until a server is not merely listening but actually answering.

Separate from `@ac-kit/test-util` on purpose: this package is free to take
heavier dependencies because only a handful of suites need it, while
`test-util` must stay light enough for every suite in the tree.

Node only.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/integration-test-util/)
for the full reference.
