
# Miscellaneous utilities for JavaScript and TypeScript

This package provides a collection of utility functions and types that can be used in various JavaScript and TypeScript projects. It includes functions for string manipulation, number formatting, object merging, timer management, and more.

## Installation

You can install the package via npm:

```bash
npm install @ac-essentials/misc-util
```

Or via yarn:

```bash
yarn add @ac-essentials/misc-util
```

## Usage

You can import and use the utilities in your project as follows:

```typescript
import { truncate } from '@ac-essentials/misc-util/lang/string/truncate';

const shortString = truncate("This is a very long string that needs to be truncated.", { length: 20 });
console.log(shortString); // Output: "This is a very lo..."
```

For more detailed documentation and examples, please refer to the [official documentation](https://github.io/anthochamp/node-essentials).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
