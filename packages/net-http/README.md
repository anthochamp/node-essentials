# @ac-kit/net-http

The parts of HTTP that concern a connection rather than the syntax of a message:
bridging to and from the Fetch API's `Headers`, classifying redirect statuses,
and probing whether an endpoint is answering.

HTTP's field grammar lives in `@ac-kit/format-http` instead — that is syntax,
with no connection involved, and a consumer parsing headers out of a file should
not install anything network-shaped to do it.

```ts
import {
  httpHeadersToFetchHeaders,
  httpIsRedirectStatus,
  isHttpAvailable,
} from "@ac-kit/net-http";

if (await isHttpAvailable("https://example.com")) {
  const response = await fetch("https://example.com", {
    headers: httpHeadersToFetchHeaders(headers),
  });

  if (httpIsRedirectStatus(response.status)) {
    follow(response.headers.get("location"));
  }
}
```

Also exposes `fetchHeadersLikeToHttpHeaders` for the reverse direction, and the
query-parameter types distinguishing what may be received from what may be sent.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/net-http/)
for the full reference.
