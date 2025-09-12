# node-essentials

Reusable configuration and utility packages for Node.js and TypeScript projects. **Primarily for my own use, but feel free to use them if they help you too!**

## Packages

| Package | Description | Docs |
|---------|-------------|------|
| [**app-util**](./packages/app-util/README.md) | Utilities for Node.js apps: logging, config, process/system helpers | [API Docs](https://anthochamp.github.io/node-essentials/app-util/) |
| [**cli**](./packages/cli/README.md) | CLI helpers for Docker, ps, git, etc. | [API Docs](https://anthochamp.github.io/node-essentials/cli/) |
| [**misc-util**](./packages/misc-util/README.md) | Foundational JS/TS utilities: string, object, async, types | [API Docs](https://anthochamp.github.io/node-essentials/misc-util/) |
| [**tsconfig**](./packages/tsconfig/README.md) | Strict, reusable TypeScript config presets | – |
| [**markdownlint-config**](./packages/markdownlint-config/README.md) | Shareable markdownlint config for Node.js/TS | – |
| [**markdownlint-cli2-config**](./packages/markdownlint-cli2-config/README.md) | Config for markdownlint-cli2, tailored for Node.js/TS | – |
| [**biome-config**](./packages/biome-config/README.md) | Biome config for Node.js/TS: linting & formatting | – |
| [**typedoc**](./packages/typedoc-config/README.md) | Typedoc config and helpers for TS docs | – |

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

### Installation

Clone the repo and install dependencies:

```sh
git clone https://github.com/anthochamp/node-essentials.git
cd node-essentials
yarn install
```

### Usage

After installing dependencies, you can use the following primary commands from the monorepo root:

 ```sh
 yarn build
 yarn test
 yarn lint
 yarn tsc:check
 ```

Each package can also be used independently. See the README in each package for details and usage examples.
