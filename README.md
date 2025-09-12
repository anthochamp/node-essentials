
# node-essentials

Reusable configuration and utility packages for Node.js and TypeScript projects. **Primarily for my own use, but feel free to use them if they help you too!**

## Installation

Clone the repo and install dependencies:

```sh
git clone https://github.com/anthochamp/node-essentials.git
cd node-essentials
yarn install
```

## Usage

After installing dependencies, you can use the following primary commands from the monorepo root:

 ```sh
 yarn build
 yarn test
 yarn lint
 yarn tsc:check
 ```

Each package can also be used independently. See the README in each package for details and usage examples.

## Packages

- [**app-util**](./packages/app-util/README.md): Reusable utilities for building Node.js applications, focusing on logging, configuration, process management, and system helpers to keep your app code clean, robust, and consistent across projects.
- [**cli**](./packages/cli/README.md): A set of reusable utilities and wrappers for working with CLI commands and processes in Node.js and TypeScript projects. Helps you build robust, scriptable command-line tools and automate system tasks, with a focus on composability and reliability.
- [**misc-util**](./packages/misc-util/README.md): A collection of utility functions and types for JavaScript and TypeScript projects, including string manipulation, number formatting, object merging, timer management, and more.
- [**tsconfig**](./packages/tsconfig/README.md): Handy, reusable TypeScript config files for Node.js and TS projects. Sets up strict, modern TypeScript settings for consistent, maintainable codebases.
- [**markdownlint-config**](./packages/markdownlint-config/README.md): Ready-to-use, shareable markdownlint configuration for Node.js and TypeScript projects. Enforces consistent markdown style with almost zero setup.
- [**markdownlint-cli2-config**](./packages/markdownlint-cli2-config/README.md): Shareable configuration for markdownlint-cli2, tailored for Node.js and TypeScript projects. Keeps markdown files clean, readable, and consistent across all your repos.
- [**biome-config**](./packages/biome-config/README.md): Reusable, shareable Biome configuration for Node.js and TypeScript projects. Enforces consistent linting and formatting with minimal setup.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.
