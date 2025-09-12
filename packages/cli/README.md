# @ac-essentials/cli

This package provides a set of reusable utilities and wrappers for working with CLI commands and processes in Node.js and TypeScript projects. It's designed to help you build robust, scriptable command-line tools and automate system tasks, with a focus on composability and reliability.

## Installation

You can install the package via npm:

```bash
npm install @ac-essentials/cli
```

Or via yarn:

```bash
yarn add @ac-essentials/cli
```

## Utility Summary

Here's a categorized summary of the main utilities available in this package (see source for full details):

### Docker Utilities

- [`buildx/buildx-build`](src/docker/buildx/buildx-build.ts): Run Docker Buildx builds programmatically with tag support.
- [`container/container-rm`](src/docker/container/container-rm.ts): Remove one or more Docker containers by name or ID, with options for force, link, and volumes.
- [`container/container-run`](src/docker/container/container-run.ts): Run a Docker container with advanced options (env, ports, name, detach, etc.).
- [`context/context-show`](src/docker/context/context-show.ts): Show the current Docker context.
- [`context/context-use`](src/docker/context/context-use.ts): Switch the active Docker context.
- [`image/image-rm`](src/docker/image/image-rm.ts): Remove one or more Docker images by ID, with options for force and no-prune.
- [`types`](src/docker/types.ts): Type aliases for Docker container identifiers.

### Git Utilities

- [`status-v1`](src/git/status-v1.ts): Get the status of a Git repository in porcelain v1 format, with support for ignored files and custom exec options.

### POSIX Utilities

- [`ps`](src/posix/ps.ts): List and filter running processes using the `ps` command, with rich filtering and field selection.

## Usage

You can import and use the utilities in your project as follows:

```typescript
import { docker, exec } from '@ac-essentials/cli';

await docker.run(['build', '.']);
const { stdout } = await exec('ls -la');
console.log(stdout);
```

For more detailed documentation and examples, please refer to the [official documentation](https://github.com/anthochamp/node-essentials).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
