import { type CSSProperties, useEffect, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { OpenSpreadsheet, OpenSpreadsheetFromPath } from "../../wailsjs/go/main/App";
import { OnFileDrop, OnFileDropOff } from "../../wailsjs/runtime/runtime";
import { ToastError } from "@/lib/ToastFunctions";
import { BuildFileMetaData } from "@/lib/metadata/parsing";
import { cn } from "@/lib/utils";

/**
 * File metadata and parsed statistics for a spreadsheet opened via the OS dialog.
 * Fields mirror the Go `SpreadsheetInfo` struct returned by `OpenSpreadsheet`.
 */
export interface SelectedSpreadsheet {
  /** Display name of the file (basename only, no directory path). */
  name: string;
  /** Absolute path on disk as reported by the OS dialog. */
  path: string;
  /** File size in bytes. */
  size: number;
  /** Total data rows across all sheets, excluding the header row. */
  totalRows: number;
  /** `true` for .xlsx / .xls files; `false` for CSV. */
  isExcel: boolean;
  /** Number of worksheets. Always 0 for CSV. */
  numberOfSheets: number;
  /** Number of named Excel tables. Always 0 for CSV. */
  totalExcelTables: number;
  /** First-row cell values, used for column mapping. */
  headers: string[];
}

interface SpreadsheetPickerProps {
  value: SelectedSpreadsheet | null;
  onChange: (file: SelectedSpreadsheet | null) => void;
}

/**
 * File picker for spreadsheets. Supports two input methods:
 * - Click to open the native OS file dialog via `OpenSpreadsheet`.
 * - Drag a file from the OS onto the drop zone via Wails `OnFileDrop` +
 *   `OpenSpreadsheetFromPath`. The drop zone is activated by the CSS variable
 *   `--wails-drop-target: drop` (default Wails `CSSDropProperty`).
 */
export function SpreadsheetPicker({ value, onChange }: SpreadsheetPickerProps) {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    OnFileDrop(async (_x, _y, paths) => {
      setDragging(false);
      const path = paths[0];
      if (!path) return;
      setLoading(true);
      try {
        const info = await OpenSpreadsheetFromPath(path);
        if (!info) return; // not a spreadsheet extension — Go returns null
        onChange({
          name: info.filename,
          path: info.path,
          size: info.size,
          totalRows: info.totalRows,
          isExcel: info.isExcel,
          numberOfSheets: info.numberOfSheets,
          totalExcelTables: info.totalExcelTables,
          headers: info.headers ?? [],
        });
      } catch (err) {
        console.error(err);
        ToastError("Could not open file", String(err));
      } finally {
        setLoading(false);
      }
    }, true);

    return () => OnFileDropOff();
  }, [onChange]);

  async function handlePick() {
    setLoading(true);
    try {
      const info = await OpenSpreadsheet();
      if (!info) return; // user cancelled dialog
      onChange({
        name: info.filename,
        path: info.path,
        size: info.size,
        totalRows: info.totalRows,
        isExcel: info.isExcel,
        numberOfSheets: info.numberOfSheets,
        totalExcelTables: info.totalExcelTables,
        headers: info.headers ?? [],
      });
    } catch (err) {
      console.error(err);
      ToastError("Could not open file", String(err));
    } finally {
      setLoading(false);
    }
  }

  if (value) {
    return (
      <Attachment state="done">
        <AttachmentMedia>
          <FileSpreadsheet className="size-5" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{value.name}</AttachmentTitle>
          <AttachmentDescription>{BuildFileMetaData(value)}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove file" onClick={() => onChange(null)}>
            <X className="size-3.5" />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handlePick}
      style={{ "--wails-drop-target": "drop" } as CSSProperties}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-ring hover:bg-muted/50",
      )}>
      <div className={cn("flex size-12 items-center justify-center rounded-full transition-colors", dragging ? "bg-primary/10" : "bg-muted")}>
        <Upload className={cn("size-5 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {loading ? (
            "Opening…"
          ) : dragging ? (
            "Drop to open"
          ) : (
            <span>
              Click to <span className="text-primary underline underline-offset-2">browse</span> or drag &amp; drop
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Supports{" "}
          <KbdGroup>
            <Kbd>.csv</Kbd> and <Kbd>.xlsx</Kbd>
          </KbdGroup>
        </p>
      </div>
    </button>
  );
}
