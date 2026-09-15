# @ac-kit/cmd-git

A typed wrapper over the `git` command-line program — not a reimplementation of
git.

Wrapping the real binary is the point: it gets credential helpers, SSH agents,
config precedence, hooks and LFS for free, none of which a from-scratch
implementation would match. What this adds is a typed signature per subcommand
and a parser for the output.

```ts
import { gitRevParse, gitStatusV1Sync } from "@ac-kit/cmd-git";

const head = await gitRevParse("HEAD", {
  execOptions: { cwd: repository },
});

// `git status --porcelain=v1`, parsed into entries rather than left as text.
for (const entry of await gitStatusV1Sync([], { execOptions: { cwd: repository } })) {
  console.log(entry.path);
}
```

Every wrapper takes an optional `AbortSignal` and passes `execOptions` —
including `cwd`, the repository to run in — straight through to `execFile`. The
`git` binary is spawned with an argv array, never through a shell, so there is
no metacharacter interpretation to guard against.

Covers `gitInit`, `gitCheckout`, `gitFetch`, `gitRemoteAdd`, `gitRevParse`,
`gitSparseCheckoutInit`/`gitSparseCheckoutSet`, and `gitStatusV1Sync`.

Requires `git` on `PATH`; it is not bundled. Node only.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/cmd-git/)
for the full reference.
