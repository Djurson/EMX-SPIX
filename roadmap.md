# SPIX Roadmap

Development roadmap for **EMX SPIX** (Supplier Products Importer & Exporter), reworked around the requirements from Jennie and the supplier example files in [files/](files/).

## Goal

Turn a supplier spreadsheet into Pyramid-ready import files with minimal clicking:

1. Download supplier images, rename to EMX article numbers, give them a systematic look via Photoroom, and drop them in the network "eline" image folder.
2. Produce small, **single-purpose** import files (only the products being updated) that a Pyramid consultant's import tool can ingest — images, descriptions, manuals, pricing, etc., each as its own file.
3. Run product descriptions through AI: rewrite + translate EN → SV, human review, then SV → FI + EN, and produce upload files for all three languages.

## Core decisions (locked)

| Topic                 | Decision                                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Article number rule   | EMX number = `<prefix><separator><supplier article number>`. Prefix and separator depend on supplier/product group. E.g. Bolt → `BM-12345`, Polisport → `PS12345`. Separator is `-` for some, empty for others → must be configurable per supplier. |
| Image destination     | Network / shared drive ("eline" folder).                                                                                                                                                                                                            |
| Pyramid import        | Produce files only; a Pyramid consultant's tool does the actual import. We match its expected format.                                                                                                                                               |
| Systematic image look | Photoroom API (background removal, PhotoFix, Reposition for padding/centering).                                                                                                                                                                     |
| Description AI        | OpenAI / GPT API.                                                                                                                                                                                                                                   |
| Stack                 | Existing Wails v2 (Go backend + React/TS frontend).                                                                                                                                                                                                 |

## Reference: example files

- **PolisportBilder.xlsx** — single sheet. Image URLs in `DROPBOX PHOTO` column (`polisport.com/downloads/SKU/<sku>.jpg`); part number in `PART #`. Good "images" source.
- **Bolt International Price List 2026.xlsx** — multi-sheet, and it is the model for the whole file strategy: separate sheets `New Products 2026`, `Updated Pricing 2026`, `Updated Description`, `Updated Weight`, `Updated Images`, `Discontinued`. SPIX should emit one focused file per update type, the same way.

---

## Milestones

### M0 — Foundation (mostly done)

Existing file picker + Go-side stats parsing. Harden it for the real pipeline.

- [ ] Read full row data in Go (not just stats): headers + cells → `[][]string` or `[]map[string]string`, per sheet.
- [ ] Multi-sheet support: list sheets, let user pick which sheet to work on.
- [ ] CSV + XLSX cell extraction (extend `parser/spreadsheet.go`; still stdlib `archive/zip` for xlsx).

**Deliverable:** Go method returning structured rows for a chosen sheet, bound to frontend.

### M1 — Column mapping + Mapping Studio UI

Map arbitrary supplier columns to EMX fields. Supplier layouts differ (Polisport vs Bolt), so mapping must be per-import.

- [ ] EMX field set: `supplierArticleNumber`, `imageUrl`, `description`, `manualUrl`, `price`, `ean`, etc.
- [ ] Auto-guess mapping by header name (`guessMapping`).
- [ ] Save/load mapping presets per supplier (so Polisport/Bolt are one click next time).

#### UI: the Mapping Studio

The old narrow `max-w-lg` wizard card is replaced by a full-window **3-pane workspace**. Import stays a simple centered screen; once a file loads the app drops into the studio. Designed for multi-sheet workbooks (Bolt has 8 sheets).

```text
┌─Sheets────────┬──────────────────────────────────────────────────┬─Config──────────┐
│ ● Updated Img │  Bolt 2026 · Updated Images · 23 rows            │ Supplier        │
│   Upd Pricing │ ┌──────────┬─────────┬───────────┬────────────┐  │ [Bolt        ▾] │
│   New Prods   │ │ EMX #  🔒│[PART# ▾]*│[DROPBOX▾]*│[DESCR  ▾]* │  │ Prefix [BM]     │
│   Upd Descr   │ ├──────────┼─────────┼───────────┼────────────┤  │ Sep    [-    ▾] │
│   Discont.    │ │ BM-12345 │ 12345   │ dropbox/. │ Bolt kit   │  │ → BM-12345      │
│   Overview    │ │ BM-12346 │ 12346   │ dropbox/. │ Chasers    │  │ Output files    │
│               │ │ ...      │         │           │            │  │ ☑ Images        │
├───────────────┴──────────────────────────────────────────────────┴ ☐ Descriptions ─┤
│  3 required fields mapped ✓     only-updated: 23 rows        [ Process 23 → ]        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Left rail — sheets:** one entry per worksheet; shows update-type names (mirrors Bolt's `Updated Images` / `Updated Pricing` split). Selecting a sheet loads its grid. Scales to many sheets.
- **Center — data grid:** the real supplier rows. Each column header is a dropdown that assigns that column to an EMX field (inline mapping, map where you see the data). A pinned, read-only **`EMX #`** column on the far left shows the resolved article number, updating live as the prefix/separator change.
- **Right drawer — config:** supplier profile (prefix + separator with a live `→ BM-12345` example) and the **output-file checklist** (Images, Descriptions, Pricing, Manuals…) — choosing which single-purpose files this run emits (feeds M5/M6).
- **Bottom bar:** required-fields status, only-updated row count, and the run/process action.

**Depends on M0** for live grid rows + real sheet names. Until M0 lands, the grid renders the mapping header row with an empty-state body.

**Deliverable:** A mapping object the rest of the pipeline consumes, plus the studio workspace it lives in.

### M2 — Article number rule engine

The heart of the tool. Build EMX number from supplier number.

- [ ] Supplier profile: `{ prefix, separator ("-" | ""), notes }`. Stored as editable config (JSON on disk).
- [ ] Function `BuildArticleNumber(supplierNumber, profile) → string` (e.g. `BM-` + `12345`, `PS` + `12345`).
- [ ] UI to manage supplier profiles (add/edit prefix + separator).
- [ ] Preview table: supplier number → resulting EMX number, before running anything.

**Open:** confirm whether prefix is chosen per supplier, per product group, or both (see Open Questions).

**Deliverable:** Deterministic, previewable supplier → EMX number mapping.

### M3 — Image download + rename

- [ ] Download each `imageUrl` to a temp folder (Go `net/http`, concurrent with a worker pool + rate limit).
- [ ] Rename to `<EMX number>` + numbering suffix for multiple images per product (e.g. `BM-12345_1`, `BM-12345_2`).
- [ ] Robust handling: 404s, timeouts, duplicate URLs, missing extensions, redirects.
- [ ] Progress UI (per-file status, retry failed).

**Deliverable:** Temp folder of correctly named original images + a download report.

### M4 — Photoroom systematic look

- [ ] Photoroom API client in Go (API key in config/env, never committed).
- [ ] Pipeline per image: background removal → Reposition (consistent padding/centering/canvas size) → optional PhotoFix.
- [ ] Define the EMX "systematic look" spec: canvas size, background colour, padding %, output format/quality. Store as a reusable template.
- [ ] Cost/rate guarding: batch, retry, skip-if-already-processed.

**Deliverable:** Processed images with a consistent EMX look, still named by EMX number.

### M5 — Move to eline folder + import file

- [ ] Configurable network "eline" path; validate it is reachable before writing.
- [ ] Move/copy processed images into the eline folder (collision strategy: overwrite vs skip vs version).
- [ ] Generate the **images** import file (xlsx/csv): EMX article number + final eline image path. **Only products being updated**, not the full catalogue.
- [ ] Match the consultant tool's expected columns/format (needs spec — see Open Questions).

**Deliverable:** Images in eline + a ready-to-import image file. This completes the original image workflow end-to-end.

### M6 — Multi-purpose import files

Generalize M5 so each data type is its own focused file, mirroring the Bolt sheet split.

- [ ] File generators per type: manuals (links), product descriptions, pricing, weights, EAN, etc.
- [ ] Shared exporter: pick EMX field(s) + only-changed rows → formatted file.
- [ ] One screen to choose which file(s) to generate from the current mapped sheet.

**Deliverable:** Push-button generation of any single-purpose Pyramid import file.

### M7 — AI product descriptions

Two-stage translation with a human checkpoint.

- [ ] **Description template / prompt spec**: encode EMX house style — key selling points in bullets, explain technical terms, easy to read, sales-oriented, tone. This is a written artifact + a prompt builder.
- [ ] Stage 1: EN source → OpenAI → rewritten EN + Swedish translation.
- [ ] Human review/edit of the Swedish text in-app.
- [ ] Stage 2: approved SV → OpenAI → FI + EN.
- [ ] Produce upload files for all three languages (SV/FI/EN), only updated products.
- [ ] OpenAI client in Go: key from config/env, batching, cost display, retry.

**Deliverable:** From English supplier text to three-language, on-brand descriptions ready for Pyramid import.

### M8 — Polish

- [ ] End-to-end "job" view: pick file → map → run images / descriptions / files → see results.
- [ ] Logging + per-run report (downloaded, processed, failed, skipped).
- [ ] Config screen: supplier profiles, eline path, Photoroom look, API keys, OpenAI prompt template.
- [ ] Single-binary build verified (`wails build`).

---

## Suggested build order

M0 → M1 → M2 → M3 → M4 → M5 gets the **image workflow fully working** (Jennie's steps 1–3). M6 generalizes to other data. M7 is the description/AI track and can be built in parallel after M1, since it only needs mapping + AI, not images.

## Open questions (do not block M0–M2)

1. **Prefix driver:** is the prefix decided by supplier, by product group, or both? Any product groups that override the supplier prefix?
2. **Consultant import format:** exact columns/sheet names/file type the consultant's tool expects, for both images and other data. A sample template from the consultant would pin M5/M6.
3. **Multiple images per product:** what numbering does Pyramid/eline expect (`_1`, `-1`, `.1`)? Is there a "main image" convention?
4. **Eline path + naming:** exact network path, and does Pyramid store the full path or just a filename relative to the eline folder?
5. **"Only updated products":** how do we know which rows are updates — a column flag, comparison against a Pyramid export, or user selection?
6. **Description source language:** always English in, or sometimes other source languages?
