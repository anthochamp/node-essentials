# @ac-essentials/biome-config

This package provides a reusable, shareable Biome configuration for Node.js and TypeScript projects. It's mainly for my own workflow, but you're welcome to use it if it fits your needs! The goal: keep your codebase clean, consistent, and easy to maintain—without having to copy-paste config everywhere.

## What does it do?

- Exports a Biome config (as JSON) with a set of sensible rules and style preferences.
- Lets you enforce consistent linting and formatting in all your projects with almost zero setup.
- Makes it easy to update Biome rules everywhere at once.

## How do I use it?

1. **Install it:**

   ```sh
   yarn add -D @ac-essentials/biome-config
   # or
   npm install --save-dev @ac-essentials/biome-config
   ```

2. **Reference it in your `biome.json`:**

   ```json
   {
     "extends": "@ac-essentials/biome-config"
   }
   ```

3. **Run Biome:**

   ```sh
   npx biome check .
   npx biome lint .
   npx biome format .
   ```

## Summary of Applied Options

- `root`: Not set as root config (allows further extension)
- `files.ignoreUnknown`: Ignores files Biome doesn't recognize
- `vcs.enabled`: Enables VCS integration
- `vcs.clientKind`: Uses git as the VCS client
- `vcs.useIgnoreFile`: Respects `.gitignore` and similar files

### Linter Rules

- `linter.rules.suspicious.noAssignInExpressions`: Disabled. Allows assignments within expressions (e.g., in conditions).
- `linter.rules.correctness.noUnusedFunctionParameters`: Set to info. Warns about unused function parameters.
- `linter.rules.nursery.noFloatingPromises`: Set to error. Disallows unhandled Promises (must await or handle).
- `linter.rules.nursery.noImportCycles`: Set to error, does not ignore type-only cycles. Prevents circular imports.
- `linter.rules.nursery.noMisusedPromises`: Set to error. Catches incorrect use of Promises (e.g., forgetting to await).
- `linter.rules.nursery.noShadow`: Set to info. Warns when a variable declaration shadows one from an outer scope.
- `linter.rules.nursery.noUnnecessaryConditions`: Set to warn. Warns about conditions that are always true/false.
- `linter.rules.nursery.noUselessUndefined`: Set to error. Disallows unnecessary use of `undefined`.
- `linter.rules.nursery.useExhaustiveSwitchCases`: Set to error. Requires all possible cases to be handled in switch statements.

See the actual config file for the full list of enabled/disabled rules and their settings.

## References

- See the actual config file in `packages/biome-config/` for details

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
