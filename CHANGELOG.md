# Changelog

All notable changes to Law Lookup for Germany + Austria + Switzerland are documented in this file.

## [0.2.2] - 2026-07-17

### Fixed

- Removed type-aware scanner warnings from provider parsing and replaced the remaining generic Obsidian element helpers with specialized helpers.
- Added declarative settings search support with the legacy `display()` fallback for Obsidian versions below 1.13.0.
- Removed irregular whitespace and unused constants.
- Resolved the reported `prefer-create-el` findings in source; no plugin-owned TypeScript `document.createElement` calls were present.
- Added GitHub artifact attestations for release bundles.

### Scope and safety

- No provider, parsing, lookup, cache, formatting, legal-source, network-domain, or insertion behavior changed.
- Existing network disclosures remain accurate.

## [0.2.1] - 2026-07-17

### Fixed

- Removed the redundant product name from the plugin description to satisfy the community-plugin manifest review.

## [0.2.0] - 2026-07-16

### Added

- A jurisdiction selector for Germany, Austria, and Switzerland.
- Explicit Austrian RIS support for 24 federal laws.
- Published English B-VG article text as the only Austrian English-language slice.
- German article lookup for 23 explicitly mapped Swiss federal laws through Fedlex.
- A multilingual GDPR/DSGVO article-lookup pilot with 24 official EU languages through Cellar and EUR-Lex.
- Jurisdiction-specific supported-law catalogs and example inputs in the plugin settings.
- Jurisdiction- and language-aware cache isolation.
- German and English plugin UI localization based on the active Obsidian locale.

### Improved

- The visible plugin title now reflects its German, Austrian, and Swiss legal scope.
- Legal-text preview, source metadata, insertion controls, and keyboard-accessible jurisdiction tabs.
- RIS extraction to exclude navigation, scripts, metadata chrome, and footer content.
- Provider boundaries for colliding abbreviations such as StGB, DSG, and ZPO.
- Source-status wording for RIS consolidated informational text.
- Reproducible production builds and broader parser, provider, cache, formatter, UI, and collision regression coverage.

### Scope and safety

- Law text is inserted only after an explicit user action.
- Provider requests occur only for user-initiated lookups.
- The plugin does not send note contents to legal-information providers.
- The plugin never generates translations.
- EU functionality remains limited to the GDPR/DSGVO pilot; generic CELEX lookup, arbitrary EU acts, consolidated versions, recitals, annexes, and the AI Act are not included.
- Swiss cantonal law and general Austrian English translations are not included.
- The plugin is a research and productivity tool and does not provide legal advice.

## Earlier 0.1.x releases

The 0.1.x line established the German federal-law lookup, preview, explicit insertion, local cache, published-English-source support for selected German laws, and the initial release structure.
