# @ac-kit/integration-test-util

Test helpers that drive and probe **external** services: starting a Docker
container for a suite, and checking that a TCP or TLS endpoint is up and
speaking the protocol you expect.

```ts
import { initDockerSuite, isTcpPortOpen } from "@ac-kit/integration-test-util";

// Registers beforeAll/beforeEach/afterEach/afterAll hooks covering the whole
// container lifecycle: build the image once, run a detached container per test,
// remove both afterwards. Every name it generates carries a random per-suite
// id, so concurrent suites never collide.
const suite = initDockerSuite("./fixtures/postfix", {
  containerRunOptions: () => ({ publish: ["25:25"] }),
});

await isTcpPortOpen(25, "127.0.0.1");
```

Pass `context` to run every command against one docker context; the suite never
switches the machine's active one. `onContainerStarting`/`onContainerStarted`
and `onContainerStopping`/`onContainerStopped` bracket each container, the
"stopping" hook firing while it is still reachable.

Also exposes `tryTcpConnectAndReadBanner` and `tryTlsConnectAndReadBanner`, for
waiting until a server is not merely listening but actually answering.

Separate from `@ac-kit/test-util` on purpose: this package is free to take
heavier dependencies because only a handful of suites need it, while
`test-util` must stay light enough for every suite in the tree.

Node only.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/integration-test-util/)
for the full reference.
