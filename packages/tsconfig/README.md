# @ac-essentials/tsconfig

Hey! This package is just a collection of handy, reusable TypeScript config files for Node.js and TS projects. **It's primarily for my own use, but feel free to use it if it helps you too!** If you’re tired of copy-pasting `tsconfig.json` everywhere, this is for you.

## What’s the point?

You get a set of base configs (`base.json`, `node-lib.json`, `node-cli.json`) that set up strict, modern TypeScript settings. It keeps your projects consistent, saves you from config drift, and makes it super easy to update settings everywhere at once.

## Config File Summary

- **base.json**: The strict, modern TypeScript config for Node.js and TypeScript projects. Sets up strict type checking, ESM support, and fast builds. Use this as your starting point for most projects.
- **node-lib.json**: Extends `base.json` for Node.js library development. Adds declaration file generation, source maps, and ensures ESM compatibility for published packages.
- **node-cli.json**: Extends `base.json` for Node.js CLI tools. Tweaks the module system for CLI entrypoints and keeps things simple for building command-line apps.

## Config File Options

### base.json

- `target`: Sets the JavaScript language version for output (latest ECMAScript).
- `resolveJsonModule`: Allows importing JSON files as modules.
- `allowArbitraryExtensions`: Allows importing files with any extension (with a declaration file).
- `noEmitOnError`: Prevents emitting files if there are type errors.
- `allowSyntheticDefaultImports`: Allows default imports from modules with no default export.
- `esModuleInterop`: Allows default imports from CommonJS modules.
- `forceConsistentCasingInFileNames`: Ensures import paths use consistent casing.
- `strict`: Enables all strict type-checking options.
- `exactOptionalPropertyTypes`: Do not differentiate between optional properties and properties that can be undefined.
- `noImplicitOverride`: Requires explicit `override` keyword for overridden class members.
- `skipDefaultLibCheck`: Skips type checking of default library declaration files.
- `skipLibCheck`: Skips type checking of all declaration files for faster builds.

### node-lib.json

- `isolatedDeclarations`: Ensures all exports are properly typed for declaration generation.
- `declaration`: Generates type declaration files for publishing libraries.
- `declarationMap`: Generates source maps for declaration files.
- `sourceMap`: Generates source maps for JavaScript output.
- `module`: Ensures ESM compatibility for libraries.
- `moduleResolution`: Ensures Node.js-style module resolution.

### node-cli.json

- `module`: Preserves the module system for CLI entrypoints.
- `resolveJsonModule`: Cancel the value in `base.json` config (use TSC default setting).

## How do I use it?

1. **Install it:**

   ```sh
   yarn add -D @ac-essentials/tsconfig
   # or
   npm install --save-dev @ac-essentials/tsconfig
   ```

2. **Extend one of the configs in your own `tsconfig.json`:**

   ```json
   {
     "extends": "@ac-essentials/tsconfig/base.json",
     "include": ["src/**/*"],
     "compilerOptions": {
       // Add or override options here
     }
   }
   ```

   If you’re building a CLI app, you might want:

   ```json
   {
     "extends": "@ac-essentials/tsconfig/node-cli.json",
     "include": ["src/**/*"]
   }
   ```

3. **Pick your preset:**

   - `base.json`: Good default for most things
   - `node-lib.json`: For Node.js libraries
   - `node-cli.json`: For CLI tools

4. **Tweak as needed:**

   Just add or override whatever you want in your own `tsconfig.json`.

## Example

```json
{
  "extends": "@ac-essentials/tsconfig/node-lib.json",
  "include": ["src/**/*.ts"],
  "compilerOptions": {
    "declaration": true
  }
}
```

## When should I use this?

- If you have a bunch of TypeScript projects and want them all to follow the same rules.
- If you want to avoid the pain of updating configs everywhere.

## More info

- Check out the actual config files in `packages/tsconfig/` for details.
- Read more about extending configs: <https://www.typescriptlang.org/tsconfig#extends>
- When you want to avoid copy-pasting and manually updating `tsconfig.json` files.

## References

- See the actual config files in `packages/tsconfig/` for details.
- For more on extending configs: <https://www.typescriptlang.org/tsconfig#extends>

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
