# @ac-essentials/typedoc-config

Reusable Typedoc configuration for TypeScript projects. This package provides a shareable `public.json` config for generating clean, public-facing API documentation with Typedoc.

## What’s included?

- **public.json**: A strict, minimal config for generating documentation that only includes your public API surface. Designed to hide internal, private, and external details from the docs.

## Config Options in `public.json`

- `excludeExternals`: **false** — Includes symbols that come from external dependencies (node_modules) in the docs.
- `excludeNotDocumented`: **false** — Includes all symbols, even if they do not have a documentation comment. (Set to `true` to only show documented items.)
- `excludeInternal`: **true** — Excludes items marked as `@internal` from the docs.
- `excludePrivate`: **true** — Excludes private class members from the docs.
- `excludeProtected`: **false** — Includes protected members in the docs.

## What does this config do?

By using `public.json`, your generated documentation will:

- Only show the public API surface of your code (no private or internal members).
- Show anything from external dependencies.
- Still include protected members (useful for library authors who want to show subclassing points).
- Show all items, even if they lack a doc comment (for full API visibility).

## Usage

1. **Install Typedoc and this config:**

   ```sh
   yarn add -D typedoc @ac-essentials/typedoc-config
   # or
   npm install --save-dev typedoc @ac-essentials/typedoc-config
   ```

2. **Reference the config in your Typedoc command:**

   ```sh
   typedoc --options node_modules/@ac-essentials/typedoc-config/public.json
   # or, if installed locally:
   typedoc --options ./packages/typedoc-config/public.json
   ```

3. **Override as needed:**

   You can extend or override any option by passing additional flags or by creating your own `typedoc.json` that extends this config.

## Example

```json
{
  "extends": "@ac-essentials/typedoc-config/public.json",
  "entryPoints": ["src/index.ts"],
  "out": "doc/generated"
}
```

## References

- See the actual config file in `packages/typedoc-config/public.json` for details.
- Typedoc options reference: <https://typedoc.org/options/>

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
