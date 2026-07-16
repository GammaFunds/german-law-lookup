# German Law Lookup

German Law Lookup is an Obsidian plugin for curated legal-reference lookup across German, Austrian, and Swiss law plus a multilingual GDPR/DSGVO pilot. It previews retrieved legal text and inserts the formatted result into the active note only after an explicit user action.

## Demo

![German Law Lookup demo](assets/german-law-lookup-demo.gif)

## Features

- Select Germany, Austria, Switzerland, or the European Union as the lookup jurisdiction.
- Look up supported section and article references directly from Obsidian.
- Preview retrieved legal text before inserting it.
- Insert text only after an explicit user action.
- Optionally include source, citation, retrieval-date, jurisdiction, language, and cache metadata.
- Use German official text as the default where applicable.
- Use published English text only for explicitly configured sources.
- Use a separate 24-language selector for the multilingual GDPR/DSGVO pilot.
- Cache successful lookups locally according to the plugin settings.
- Follow the active Obsidian interface language for plugin UI labels.

## Current legal scope

The plugin supports only explicitly mapped laws and reference forms. The complete supported-law catalog and example inputs are available in the plugin settings.

### Germany

The German scope covers selected federal laws retrieved through the validated Gesetze im Internet provider path. It supports common section references and selected article references, including GG and EGBGB forms.

Examples:

- `§ 823 BGB`
- `BGB 823`
- `§ 242 StGB`
- `SGB V § 1`
- `Art. 1 GG`
- `Art. 229 § 6 EGBGB`

Published English legal text is available only for explicitly configured German laws. If an English source is unavailable or not configured, the lookup falls back to German official text. The plugin never generates translations.

### Austria

The Austrian scope covers exactly 24 explicitly mapped federal laws through RIS:

- ABGB
- StGB
- B-VG
- ZPO
- JN
- EO
- UGB
- StPO
- GmbHG
- AktG
- IO
- KartG
- FBG
- GewO
- KSchG
- VersVG
- AVG
- VwGVG
- VwGG
- VfGG
- ZustG
- SPG
- DSG
- BAO

Select **Austria** in the jurisdiction field or use an explicit Austrian reference. German and Austrian laws with the same abbreviation remain isolated by jurisdiction.

Examples:

- `§ 1295 ABGB`
- `§ 75 StGB`
- `Art. 144 B-VG`
- `§ 1 GmbHG`
- `§ 35a DSG`

Austrian English support is limited to the published English B-VG article text configured for this plugin. It does not provide general English translations for Austrian law.

### Switzerland

The Swiss scope covers article references for 23 explicitly mapped federal laws through Fedlex:

- BV
- ZGB
- OR
- StGB
- ZPO
- StPO
- SchKG
- VwVG
- BGG
- DSG
- IPRG
- DBG
- StHG
- AHVG
- IVG
- ATSG
- ArG
- SVG
- AIG
- KG
- URG
- PatG
- MSchG

Select **Switzerland** in the jurisdiction field. The current Swiss provider retrieves German article text only. Swiss section-style references, cantonal law, and unlisted federal laws are outside the current scope.

Examples:

- `Art. 8 BV`
- `Art. 1 ZGB`
- `Art. 1 OR`
- `Art. 1 DSG`

### European Union

EU support in version 0.2.0 is limited to articles of the GDPR/DSGVO (Regulation (EU) 2016/679) in all 24 official EU language versions. Generic EU act lookup is not included yet but is under development.

- Article references only.
- 24 official EU languages through the existing language selector.
- Retrieval through Publications Office Cellar with official language-specific EUR-Lex source links.
- Separate jurisdiction and cache identity from German, Austrian, and Swiss lookups.

Examples:

- `Art. 6 DSGVO`
- `GDPR Art. 6`

This release does not provide generic CELEX lookup or general support for arbitrary EU regulations, directives, decisions, consolidated versions, recitals, annexes, corrigenda, or the AI Act.

## Sources and legal status

The plugin retrieves text from public legal-information services:

- **Germany:** Gesetze im Internet.
- **Austria:** RIS, Bundesrecht konsolidiert.
- **Switzerland:** Fedlex.
- **European Union:** Publications Office Cellar and EUR-Lex for the GDPR/DSGVO pilot.

RIS consolidated federal-law text is an informational, legally non-binding version and is not presented as an authentic Federal Law Gazette publication. Source status is shown in the lookup metadata where available.

The plugin is a research and productivity tool. It is not legal advice. Always verify legal text, version, applicability, and source status against the relevant official publication before relying on it.

## Privacy and network access

- Loading the plugin does not initiate legal-provider requests.
- Network requests occur only after a user starts a lookup.
- The request contains the selected legal reference and the provider parameters needed to retrieve it.
- Note contents are not sent to legal-information providers.
- The plugin does not use AI services and never generates translations.
- Successful results may be cached locally in Obsidian plugin data according to the configured cache settings.

## Installation

For manual installation, create this directory:

```text
<your-vault>/.obsidian/plugins/german-law-lookup/
```

Copy exactly these release assets into it:

- `manifest.json`
- `main.js`
- `styles.css`

Reload Obsidian and enable **German Law Lookup** under **Settings → Community plugins**.

## Usage

1. Open the command palette.
2. Run the law lookup command.
3. Select Germany, Austria, Switzerland, or the European Union.
4. Enter a supported legal reference.
5. For the GDPR/DSGVO pilot, select the desired EU language.
6. Review the preview and source information.
7. Insert the result into the active note.

The plugin never modifies a note without an explicit insertion action.

## Development

Install the locked dependencies:

```bash
npm ci
```

Run the complete test suite:

```bash
npm test
```

Build the production bundle:

```bash
npm run build
```

## Release assets

An Obsidian release contains:

- `manifest.json`
- `main.js`
- `styles.css`

`versions.json` remains in the repository to map plugin versions to their minimum supported Obsidian version. Do not include `node_modules`, test output, source maps, or development files in the release assets.

## License

MIT. See [LICENSE](LICENSE).
