# German Law Lookup

Look up selected federal law references from Germany, Austria, and Switzerland in Obsidian, preview the retrieved provision, and insert formatted law text into the active note.

## Features

- Select Germany, Austria, or Switzerland as the jurisdiction for a lookup.
- Look up explicitly supported federal statutes and provisions.
- Preview retrieved law text before inserting it.
- Insert law text only after an explicit user action.
- Optionally include source, law reference, retrieval date, and cache metadata.
- Use German-language law text by default.
- Use a published English text only where an explicitly supported source provides one.
- Follow the Obsidian interface language for plugin UI labels.
- Cache successful lookups locally when caching is enabled.

## Supported jurisdictions

### Germany

German federal provisions are retrieved through the configured German provider chain.

Examples:

- `§ 823 BGB`
- `§ 242 StGB`
- `SGB V § 1`
- `Art. 1 GG`
- `Art. 229 § 6 EGBGB`

The complete list of explicitly supported German laws is available in the plugin settings.

### Austria

Austrian federal law is retrieved from RIS, the Austrian Legal Information System.

Supported Austrian laws:

- ABGB — Allgemeines bürgerliches Gesetzbuch
- StGB — Strafgesetzbuch
- B-VG — Bundes-Verfassungsgesetz
- ZPO — Zivilprozessordnung
- JN — Jurisdiktionsnorm
- EO — Exekutionsordnung
- UGB — Unternehmensgesetzbuch
- StPO — Strafprozeßordnung 1975

Examples:

- `ABGB § 1295`
- `StGB § 75`
- `B-VG Art. 144`
- `UGB § 1`

RIS consolidated federal law is presented as an informational version and is legally non-binding. A published English B-VG text is available where explicitly supported and selected.

### Switzerland

Swiss federal law is retrieved from Fedlex.

Supported Swiss laws:

- BV — Bundesverfassung
- ZGB — Zivilgesetzbuch
- OR — Obligationenrecht
- StGB — Schweizerisches Strafgesetzbuch
- ZPO — Schweizerische Zivilprozessordnung
- StPO — Schweizerische Strafprozessordnung
- SchKG — Bundesgesetz über Schuldbetreibung und Konkurs
- VwVG — Verwaltungsverfahrensgesetz
- BGG — Bundesgerichtsgesetz
- DSG — Datenschutzgesetz
- IPRG — Bundesgesetz über das Internationale Privatrecht
- DBG — Bundesgesetz über die direkte Bundessteuer
- StHG — Steuerharmonisierungsgesetz
- AHVG — Alters- und Hinterlassenenversicherungsgesetz
- IVG — Invalidenversicherungsgesetz
- ATSG — Allgemeiner Teil des Sozialversicherungsrechts
- ArG — Arbeitsgesetz
- SVG — Strassenverkehrsgesetz
- AIG — Ausländer- und Integrationsgesetz
- KG — Kartellgesetz
- URG — Urheberrechtsgesetz
- PatG — Patentgesetz
- MSchG — Markenschutzgesetz

Examples:

- `BV Art. 8`
- `ZGB Art. 1`
- `OR Art. 1`
- `StGB Art. 1`
- `SchKG Art. 1`

## Important limitations

- The plugin supports selected federal law from Germany, Austria, and Switzerland; it does not provide complete statutory coverage.
- This release does not support EU law.
- It does not support German or Austrian state law, Swiss cantonal law, case law, legal commentary, or legal advice.
- Unsupported laws and provisions are not inferred or approximated.
- The plugin does not generate translations.
- English law text is used only where an explicitly supported public source provides a published English version.
- Users should verify retrieved text against the cited official source before relying on it.

## Sources

German Law Lookup uses public legal-information systems:

- Germany: Rechtsinformationen des Bundes during its NeuRIS test phase, with Gesetze im Internet as the established provider and fallback path.
- Austria: RIS — Rechtsinformationssystem des Bundes.
- Switzerland: Fedlex.

The German provider chain uses an exact NeuRIS match where available. Gesetze im Internet supplies the established German HTML path and explicitly supported published English texts.

The plugin preserves source, retrieval, jurisdiction, and cache metadata. Jurisdiction-specific notices indicate where a consolidated text is informational rather than an authoritative promulgation.

## Privacy and network access

Network requests are made only for user-initiated lookups.

- The selected jurisdiction, law code, provision, and requested source variant are used to retrieve the matching text.
- Requests are sent only to the applicable public legal-information provider.
- Note contents are not sent to external services.
- The plugin does not use AI services.
- The plugin does not generate translations.
- Retrieved law text may be cached locally in the Obsidian plugin data when caching is enabled.

## Installation

### Community plugin directory

1. Open **Settings → Community plugins** in Obsidian.
2. Select **Browse**.
3. Search for **German Law Lookup**.
4. Install and enable the plugin.

### Manual installation

Copy the release files into:

```text
<your-vault>/.obsidian/plugins/german-law-lookup/
```

Required release files:

- `manifest.json`
- `main.js`
- `styles.css`

Then reload Obsidian and enable **German Law Lookup** under **Settings → Community plugins**.

## Usage

1. Open the command palette.
2. Run **Look up law** or **Gesetz nachschlagen**.
3. Select Germany, Austria, or Switzerland.
4. Enter a supported reference.
5. Review the preview.
6. Insert the result into the active note.

Examples:

- Germany: `§ 823 BGB`
- Austria: `ABGB § 1295`
- Switzerland: `BV Art. 8`

The plugin does not modify notes automatically.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the plugin:

```bash
npm run build
```

## Release files

A release should include:

- `manifest.json`
- `main.js`
- `styles.css`
- `versions.json` when publishing version compatibility metadata

Do not include `node_modules`.

## Disclaimer

This plugin is a research and productivity tool. It is not legal advice. Always verify legal texts against the cited official source before relying on them.
