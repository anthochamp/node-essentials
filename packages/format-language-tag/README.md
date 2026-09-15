# @ac-kit/format-language-tag

BCP 47 language tags: parse, print, and match.

Two standards, one package:

- **RFC 5646** defines the tag itself — `en`, `zh-Hant-HK`, `de-DE-u-co-phonebk`
  — as a sequence of positional subtags. `parseLanguageTag` turns one into a
  tree you can inspect a field at a time.
- **RFC 4647** defines what it means for a tag to _match_ a range, which is what
  you need to pick a translation catalogue for `Accept-Language` or
  `navigator.languages`. `lookupLanguageTag` and `filterLanguageTags` implement
  its two schemes.

`Intl.Locale` parses a tag but will not match one, and `Intl.LocaleMatcher` is
still a proposal; this package covers both halves and runs anywhere.

## Install

```sh
npm install @ac-kit/format-language-tag
```

## Parsing

```ts
import {
  parseLanguageTag,
  printLanguageTag,
} from "@ac-kit/format-language-tag";

const tag = parseLanguageTag("zh-cmn-Hans-CN-boont-u-co-phonebk-x-lo");
// {
//   kind: "langtag",
//   language: "zh",
//   extlangs: ["cmn"],
//   script: "Hans",
//   region: "CN",
//   variants: ["boont"],
//   extensions: [{ singleton: "u", subtags: ["co", "phonebk"] }],
//   privateUse: ["lo"],
// }
```

Case is not part of a tag's identity, so parsing normalises it and printing
emits the conventional form:

```ts
printLanguageTag(parseLanguageTag("EN-latn-us")); // "en-Latn-US"
```

`parseLanguageTag` throws `LanguageTagSyntaxError` on input that does not meet
the grammar. Use `tryParseLanguageTag` where malformed input is an expected
outcome rather than a fault, or `isWellFormedLanguageTag` when only the verdict
matters.

Private-use tags (`x-whatever`) and the seventeen irregular grandfathered tags
(`i-klingon`, `sgn-BE-FR`, …) are separate `kind`s, because neither decomposes
into positional subtags.

### Well-formed is not valid

This package checks the **grammar**, not the IANA Language Subtag Registry.
`qq-Zxxx-QQ` is well-formed and parses without complaint even though none of its
subtags is registered. Validity needs a versioned dataset that would have to
ship with the package and be kept current; if you need it, check the registry
yourself against the parsed subtags.

## Matching

The matching functions take plain strings, because that is what RFC 4647 defines
and what callers hold. Comparison is case-insensitive, and the strings you get
back are your own.

```ts
import {
  lookupLanguageTag,
  filterLanguageTags,
} from "@ac-kit/format-language-tag";

const available = ["en", "en-GB", "fr", "zh-Hant"];

// Lookup (RFC 4647 §3.4) — one best answer, by progressive truncation.
lookupLanguageTag(available, ["en-Latn-US"]); // "en"
lookupLanguageTag(available, ["de", "fr"]); // "fr"
lookupLanguageTag(available, ["ja"], { defaultTag: "en" }); // "en"

// Filtering (RFC 4647 §3.3) — every match, ordered by range priority.
filterLanguageTags(available, ["en"]); // ["en", "en-GB"]
```

Filtering has two schemes. Basic filtering extends a range one whole subtag at a
time, so `en-US` does not match `en-Latn-US`. Extended filtering lets the tag
interleave extra subtags and honours `*` anywhere in the range:

```ts
filterLanguageTags(["en-Latn-US"], ["en-US"]); // []
filterLanguageTags(["en-Latn-US"], ["en-US"], { scheme: "extended" }); // ["en-Latn-US"]
filterLanguageTags(["de-DE", "fr-FR"], ["*-DE"], { scheme: "extended" }); // ["de-DE"]
```

`isLanguageTagMatch` answers the same question for a single tag and range.

`languageTagPrefixes` exposes the truncation sequence lookup is built on, which
is what you want when resolving a catalogue file by hand:

```ts
languageTagPrefixes("en-Latn-US-u-co-phonebk");
// ["en-Latn-US-u-co-phonebk", "en-Latn-US-u-co", "en-Latn-US", "en-Latn", "en"]
```

A truncation ending in a singleton subtag is skipped, as RFC 4647 §3.4 requires.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-language-tag/)
for the full reference.
