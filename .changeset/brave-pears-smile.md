---
"@ac-kit/integration-test-util": minor
---

**Breaking:** `initDockerSuite` no longer switches the machine's docker context,
and names everything it creates uniquely.

- `contextName` is now `context`, and it is passed to every docker command
  instead of being installed with `docker context use`. The old behaviour raced
  between concurrent suites and left the developer's own context switched when a
  run crashed.
- The image tag and the container names now carry a random per-suite id, so two
  suites — including two runs of the same file — can no longer share a tag, and
  one suite's teardown can no longer remove another's image.
- Teardown runs every step even when an earlier one throws, reporting the
  failures together, so a container that refuses to die no longer strands the
  image. The image is marked for removal before the build rather than after, so
  a build that tags and then fails still gets cleaned up.
- Containers are started detached. Without it a foreground container never
  returned control to the test.
- New `onContainerStarting` and `onContainerStopping` hooks fire before the run
  and while the container is still reachable, beside the existing
  `onContainerStarted` and `onContainerStopped`.
- `containerRunOptions` may no longer set `name`, `context` or `detach`, which
  the suite owns.
