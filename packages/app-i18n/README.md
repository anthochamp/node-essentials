# @ac-kit/app-i18n

Message catalogues, plural rules, and locale negotiation.

A translator here is a chain of catalogues plus a lookup that always answers.
You give it every catalogue you have and what the user asked for; it works out
which ones apply, in what order, and falls back to the source text when none of
them carries a message.

## Install

```sh
npm install @ac-kit/app-i18n
```

## Usage

```ts
import { parsePo } from "@ac-kit/format-po";
import { createTranslator, messageCatalogueFromPo } from "@ac-kit/app-i18n";

const translator = createTranslator({
  catalogues: [
    messageCatalogueFromPo(parsePo(frenchPo)),
    messageCatalogueFromPo(parsePo(canadianFrenchPo)),
  ],
  locales: ["fr-CA", "en"],
});

translator.getMessage("Open"); // "Ouvrir (CA)"
translator.getMessage("Open", { context: "verb" }); // "Ouvrez"
translator.getPluralMessage("%d file", "%d files", 3); // "%d fichiers"
```

`getMessage` never returns `null`: a message no catalogue carries comes back as
the id you passed. `getPluralMessage` falls back the way gettext does — the
singular for one, the plural for anything else.

## Locale negotiation

`locales` is a list of RFC 4647 language ranges, most preferred first. Each is
truncated a subtag at a time, and every catalogue matching along the way joins
the chain in that order — so asking for `fr-CA` consults the `fr-CA` catalogue
first and the `fr` one after it, giving a regional catalogue that only overrides
a handful of messages exactly the behaviour you want.

A range matching nothing is skipped rather than failing the whole negotiation,
and `*` is ignored rather than treated as matching everything.
`translator.locales` reports what was actually selected.

Negotiation happens once, when the translator is built. Each lookup after that
costs one map read per catalogue that matched.

## Catalogues

`messageCatalogueFromPo` reads the locale from the header's `Language` field and
the plural rule from `Plural-Forms`. Entries that are obsolete, untranslated, or
flagged `fuzzy` are left out, so a lookup that misses falls through to the next
catalogue instead of returning an empty string. Pass `{ fuzzy: true }` to
include machine-merged guesses.

For a catalogue that does not come from a PO file, build one directly:

```ts
import { createMessageCatalogue, messageKey } from "@ac-kit/app-i18n";

const catalogue = createMessageCatalogue({
  locale: "fr",
  messages: new Map([
    ["Open", ["Ouvrir"]],
    [messageKey("Open", "verb"), ["Ouvrez"]],
    ["%d file", ["%d fichier", "%d fichiers"]],
  ]),
});
```

Each value holds one string per plural form. A `MessageCatalogue` answers `null`
for anything it lacks, which is what makes several of them chainable.

## What this does not do

**Interpolation.** A message id is a format string, and choosing whose format
syntax it uses is the caller's decision, not a catalogue's — `%s` for gettext
tooling compatibility, a template literal, `Intl.NumberFormat` for a count.
Inventing a fifth placeholder syntax here would only add one more thing that
`xgettext` cannot read.

**Loading.** Reading catalogue files from disk needs a filesystem; this package
is portable and runs unchanged in a browser or an edge runtime. Parse with
`@ac-kit/format-po` and hand the entries over.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-i18n/)
for the full reference.
