import type { SelectedSpreadsheet } from "@/components/SpreadsheetPicker";

/**
 * A single worksheet's parsed contents. `rows` excludes the header row.
 * Until the Go row-extraction step (roadmap M0) lands, `rows` is empty and the
 * grid renders an empty-state body under the mapping header.
 */
export interface SheetData {
  /** Sheet/tab name as it appears in the workbook. */
  name: string;
  /** First-row cell values used as column headers. */
  headers: string[];
  /** Data rows, each a cell array aligned to {@link headers}. */
  rows: string[][];
}

/** A parsed workbook: one or more sheets from a single spreadsheet file. */
export interface Workbook {
  /** Source file display name. */
  fileName: string;
  /** Worksheets in the file, in document order. */
  sheets: SheetData[];
}

/**
 * Adapts a {@link SelectedSpreadsheet} into a {@link Workbook}.
 *
 * The current Go binding returns only the first sheet's headers and aggregate
 * counts — no per-sheet names or row data. This shim therefore produces a
 * single sheet with no rows; once M0 returns structured per-sheet data this
 * function is the one place to widen.
 * @param file - The selected spreadsheet from the import step.
 * @returns A workbook with one header-only sheet.
 */
export function toWorkbook(file: SelectedSpreadsheet): Workbook {
  return {
    fileName: file.name,
    sheets: [{ name: file.name, headers: file.headers, rows: [] }],
  };
}
