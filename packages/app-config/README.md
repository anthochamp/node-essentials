# @ac-kit/app-config

Loading a command-line tool's configuration file, wherever the user put it.

A CLI is expected to find its config in any of a dozen places — `package.json`,
a dotfile, a `.config/` directory, with or without an extension — and to let one
config `extends` another, the way `tsconfig.json` and `.eslintrc` do. This does
both: `cosmiconfig` performs the search, and this resolves the `extends` chain,
merges it over your defaults, and hands back a validated object with `extends`
already removed.

```typescript
import { loadCliConfig } from "@ac-kit/app-config";

const config = await loadCliConfig(
  "mytool",
  (value) => myToolConfigSchema.parse(value),
  { outDir: "dist", strict: true },
);
```

`loadCliConfig` throws when no configuration file is found; the parser you pass
decides what an invalid one does.

Also exposes `resolveExtendableConfig` and `resolveExtendsValue` for resolving
an `extends` chain you already loaded yourself, and `editorconfig` helpers for
reading `.editorconfig` settings.

Node only: it reads the filesystem.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-config/)
for the full reference.
