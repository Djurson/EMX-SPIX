# CLAUDE.md

Guidance for working in this repository. Keep it current: when you change architecture, commands, or conventions, update this file in the same change.

## Project overview

**EMX SPIX** (Supplier Products Importer & Exporter) is an internal desktop app for EMX Racing. It ingests a supplier spreadsheet (`.xlsx` / `.csv`), maps its columns to EMX fields, and produces **Pyramid-ready import files** plus a renamed, systematically-styled product image set — with minimal manual clicking.

Pyramid Business Studio is EMX's internal ERP (products, product groups, item numbers). SPIX does **not** import into Pyramid directly; it produces files that a Pyramid consultant's import tool ingests.

The full plan, milestones, and locked decisions live in [`roadmap.md`](roadmap.md). Read it before non-trivial feature work — it is the source of truth for where the product is headed. [`requirements.md`](requirements.md) is the original stakeholder brief; [`files/`](files/) holds real supplier example spreadsheets (Bolt, Polisport).

### Pipeline (target)

1. Map supplier columns → EMX fields.
2. Build EMX item number = `<prefix><separator><supplier number>` (e.g. `BM-12345`, `PS12345`).
3. Download images → rename to EMX number → systematic look via the **Photoroom API** → move to the network "eline" image folder.
4. Emit small, **single-purpose** files (only updated products): images, descriptions, pricing, manuals — each its own file.
5. Product descriptions: rewrite + translate via **OpenAI** (EN → SV, human review, then SV → FI + EN).

### Stack

[Wails v2](https://wails.io/): a Go backend compiled into a native binary with a React/TypeScript + Vite + Tailwind + shadcn/ui webview frontend. Ships as a single executable — no runtime dependencies on the target machine.

## Commands

```sh
wails dev              # Full dev env: Go + frontend hot reload, regenerates wailsjs bindings
wails build            # Production binary → build/bin/
go build ./...         # Verify Go compilation (fast check, no frontend)
cd frontend && npx tsc --noEmit   # Typecheck frontend without building
cd frontend && npm run build      # tsc + vite build (frontend only; Wails bindings unavailable)
```

## Architecture

### Go ↔ frontend bridge

Wails exposes exported methods on `App` (in [`app.go`](app.go)) as TypeScript bindings under `frontend/wailsjs/` — **auto-generated, never edit by hand**. They regenerate every `wails dev` run.

**After adding or changing a Go method, run `wails dev` once to regenerate `wailsjs/`** before the frontend can call it.

### File I/O rule

All file reading happens in **Go**. The frontend never reads files directly — the browser `File` API is not used in any active path. Files enter Go by absolute path two ways:

- OS dialog via `runtime.OpenFileDialog` → `OpenSpreadsheet()`.
- Native drag-and-drop (`OnFileDrop`) → `OpenSpreadsheetFromPath(path)`.

Both return the same `SpreadsheetInfo` struct.

### Parsing (`parser/`, no Wails dependency)

Spreadsheet stats and headers are parsed with the **standard library only** — no third-party spreadsheet lib:

- **CSV**: `encoding/csv`.
- **XLSX**: `archive/zip` + worksheet XML. Stats use byte-counting of `<row` tags; headers resolve shared strings (`readSharedStrings`) and cell references (`resolveCell`, `columnIndex`).

### Frontend: the Mapping Studio

Flow: import screen (`SpreadsheetPicker`) → **full-window 3-pane Mapping Studio** once a file loads ([`App.tsx`](frontend/src/App.tsx) gates on `inStudio`). The studio:

- **Left** — `SheetRail`: worksheet list (workbooks may hold many sheets, e.g. Bolt's per-update-type split).
- **Center** — `MappingGrid`: real data grid; each column header is a dropdown assigning an EMX field; a pinned read-only `EMX #` column resolves live.
- **Right** — `ConfigDrawer`: supplier prefix/separator (live example) + output-file checklist.

Spreadsheet data is modeled by `Workbook` / `SheetData` ([`lib/workbook.ts`](frontend/src/lib/workbook.ts)). `toWorkbook` is the single adapter point — widen it when the Go side returns per-sheet rows (roadmap M0).

## Key files

| Path                                                                      | Responsibility                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`app.go`](app.go)                                                        | Wails `App`; bound methods `OpenSpreadsheet`, `OpenSpreadsheetFromPath`; `SpreadsheetInfo` |
| [`main.go`](main.go)                                                      | Wails options; window config; `DragAndDrop.EnableFileDrop`                                 |
| `parser/spreadsheet.go`                                                   | CSV + XLSX stats and header parsing; no Wails dependency                                   |
| `frontend/src/App.tsx`                                                    | Top-level: import screen → Mapping Studio gate                                             |
| `frontend/src/components/SpreadsheetPicker.tsx`                           | File picker — OS dialog + drag-and-drop                                                    |
| `frontend/src/components/studio/MappingStudio.tsx`                        | 3-pane workspace orchestrator + status bar                                                 |
| `frontend/src/components/studio/{SheetRail,MappingGrid,ConfigDrawer}.tsx` | Studio panes                                                                               |
| `frontend/src/lib/columnMapping.ts`                                       | EMX fields, `guessMapping`, `assignHeader`, `fieldForHeader`, `isMappingComplete`          |
| `frontend/src/lib/supplierProfile.ts`                                     | `SupplierProfile`, `BuildArticleNumber` (prefix + separator rule)                          |
| `frontend/src/lib/outputFiles.ts`                                         | Output-file types (images, descriptions, pricing, manuals)                                 |
| `frontend/src/lib/workbook.ts`                                            | `Workbook`/`SheetData` model + `toWorkbook` adapter                                        |
| `frontend/src/lib/metadata/parsing.ts`                                    | `BuildFileMetaData`, `SpreadsheetStats`                                                    |
| `frontend/src/lib/ToastFunctions.tsx`                                     | `ToastError`, `ToastSucess` wrappers                                                       |
| `frontend/src/lib/utils.ts`                                               | `cn()` Tailwind class merger                                                               |
| `frontend/wailsjs/`                                                       | Auto-generated Wails bindings — do not edit                                                |

## Code conventions

### Documentation

All exported functions, interfaces, and interface fields get doc comments. TS uses JSDoc with `@param` / `@returns` on non-obvious signatures:

```ts
/**
 * Builds a display metadata string for a spreadsheet file.
 * @param file - Selected spreadsheet with parsed stats.
 * @returns Dot-separated string, e.g. `"XLSX · 1.2 MB · 4,200 rows · 3 tables"`.
 */
export function BuildFileMetaData(file: SelectedSpreadsheet): string { ... }
```

Go uses standard doc comments (single line above the declaration, no blank line):

```go
// GetStats parses the spreadsheet at path and returns row and structure counts.
func GetStats(path, filename string) (SpreadsheetStats, error) { ... }
```

### Inline comments

Write **no** inline comments unless the reason behind the code is non-obvious. Document _why_, never _what_.

### UI

Use **shadcn/ui** components first. Only drop to raw HTML tags when no shadcn component fits.

### Imports

`@/` alias for everything under `frontend/src/`:

```ts
import { cn } from "@/lib/utils";
import { BuildArticleNumber } from "@/lib/supplierProfile";
```

Relative paths for Wails-generated bindings (they live outside `src/`):

```ts
import { OpenSpreadsheet } from "../../wailsjs/go/main/App";
import { OnFileDrop } from "../../wailsjs/runtime/runtime";
```

## Gotchas

### Drag-and-drop needs an inline CSS variable

Native file drop (Wails) only fires `OnFileDrop` for elements whose CSS variable `--wails-drop-target` equals `drop` (default `CSSDropProperty`). Tailwind classes **cannot** set CSS variables — set it on the element's inline `style`:

```tsx
style={{ "--wails-drop-target": "drop" } as CSSProperties}
```

Register `OnFileDrop(cb, true)` on mount, `OnFileDropOff()` on unmount. The callback receives **absolute paths** — hand them to `OpenSpreadsheetFromPath`, not the browser `File` API.

### XLSX is a ZIP

`.xlsx` files are ZIP archives of XML. `parser/spreadsheet.go` reads them directly via `archive/zip` — no spreadsheet library. Row counting uses `<row` byte counting; the first row per sheet is treated as a header.

### Dialog / path returns null on cancel or non-spreadsheet

`runtime.OpenFileDialog` returns `("", nil)` on cancel; `OpenSpreadsheetFromPath` returns `(nil, nil)` for an empty path or a non-spreadsheet extension. Guard both sides:

```go
if path == "" {
    return nil, nil
}
```

```ts
const info = await OpenSpreadsheet();
if (!info) return;
```

### `richColors` in Toaster

`main.tsx` mounts `<Toaster richColors closeButton position="top-right" />`. `richColors` applies type-specific icon colours; custom icon colours (e.g. `text-red-300`) still layer on top. Sonner's icon-to-text gap is the CSS var `--toast-icon-margin-end` (set it on the toast `style`, not a margin class on the icon).
