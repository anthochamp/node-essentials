# @ac-kit/format-yaml

## 0.2.0

### Minor Changes

- a5c4d66: - **Breaking:** `parseYaml` throws `YamlParseError` instead of a bare
    `Error("parse YAML")`. The parser produces a list of diagnostics, each with a
    code, a character range and a line and column, and all of it was being
    collapsed into one opaque `Error` whose only useful content was its `cause` —
    so a caller reporting a bad config file had to reach through an undocumented
    wrapper, and only ever saw the first problem. `YamlParseError` extends
    `SyntaxError` and carries `diagnostics`, one entry per problem found, with
    `code`, `startOffset`, `endOffset`, `line` and `column`; its message is the
    parser's own, which already names the position, suffixed with a count when
    there is more than one, and `cause` stays set to the first underlying
    diagnostic. Conversion to a plain value still fails as before — an alias bound
    or a reviver throwing is wrapped in `Error("parse YAML", { cause })`, because
    it is not a syntax fault. Code matching on the old `"parse YAML"` message for
    malformed input has to catch `YamlParseError` instead.
  - The alias-expansion bound is now this package's contract, as
    `DEFAULT_YAML_MAX_ALIAS_COUNT`. An anchor referenced from inside another
    anchor expands multiplicatively — the "billion laughs" denial of service — and
    `maxAliasCount` is the only thing between untrusted YAML and an unbounded
    allocation, yet the value in force was whatever `yaml` happened to default to,
    undocumented here and free to change under us. `parseYaml` now passes it
    explicitly and exports it, so the protection is stated rather than inherited,
    and `YamlParseStream` gets the same bound. A caller-supplied `maxAliasCount`
    still wins in either direction: raise it, tighten it, or set `-1` to turn the
    check off. It applies where a document becomes a plain value, so
    `parseYamlDocument` and `parseAllYamlDocuments` do not enforce it — they
    return nodes; pass the constant to the document's own `toJS()` there.
  - Custom tags are writable without depending on `yaml` directly.
    `YamlParseOptions` has always accepted `customTags`, while the package
    exported none of the types that option needs — so anyone defining a tag had to
    add `yaml` to their own dependencies to name a `ScalarTag`, and the package
    advertised a contract it did not hand over. The node, tag and visitor model is
    now re-exported under `Yaml`-prefixed names: `YamlScalarTag`,
    `YamlCollectionTag`, `YamlTags`, `YamlNode`, `YamlDocument`, `YamlScalar`,
    `YamlMap`, `YamlSeq`, `YamlAlias`, `YamlPair`, `YamlSchema`, the `isYaml…`
    guards, `visitYaml` / `visitYamlAsync`, `yamlToJs`, and the context types a
    tag's own callbacks are typed against. The prefix is not decoration: the
    package's entry point is a flat barrel, and bare `Node` and `Document` would
    shadow the DOM globals in the browsers this portable package targets.
  - New `resolveYamlAsyncTags(node)`. A tag whose `resolve` is declared `async`
    hands the composer a `Promise`, which it stores as the scalar's value
    verbatim, so `toJS()` serialises the promise rather than what it settles to.
    Awaiting the tree once, between composing it and reading it, is what makes an
    async tag usable at all.
  - New `addYamlTagDirective(source, handle, prefix)`. A `%TAG` directive is
    per-document and must precede that document's `---`, so a handle cannot be
    injected once into a multi-document stream. Each document is inspected and
    patched on its own, existing directives are joined rather than duplicated, and
    the `---` and `...` markers the grammar then requires are inserted.
  - Dropped the `./file` subpath from `publishConfig.exports`. It pointed at
    `./dist/file.js`, which no `src/file.ts` ever produced, and the development
    `exports` map never declared it, so the published package advertised an entry
    point that threw `ERR_MODULE_NOT_FOUND` on import.

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/format-core@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/format-core@0.1.1
