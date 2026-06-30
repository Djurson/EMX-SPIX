import { cn } from "@/lib/utils";
import type { SheetData } from "@/lib/workbook";
import { Button } from "@/components/ui/button";

interface SheetRailProps {
  /** Worksheets to list. */
  sheets: SheetData[];
  /** Index of the currently selected sheet. */
  active: number;
  /** Called with the index of a newly selected sheet. */
  onSelect: (index: number) => void;
}

/**
 * Left rail listing the workbook's worksheets. Mirrors a supplier file's
 * per-type sheet split (e.g. Bolt's `Updated Images` / `Updated Pricing`).
 * Selecting an entry loads that sheet's grid.
 */
export function SheetRail({ sheets, active, onSelect }: SheetRailProps) {
  return (
    <div className="w-full flex flex-col shrink-0 gap-0.5 overflow-y-auto">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sheets</p>
      {sheets.map((sheet, i) => (
        <Button
          key={`${sheet.name}-${i}`}
          type="button"
          onClick={() => onSelect(i)}
          className={cn("flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors w-full", i === active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted text-foreground")}>
          <span className="truncate">{sheet.name}</span>
          <span className="text-xs text-muted-foreground">{sheet.rows.length} rows</span>
        </Button>
      ))}
    </div>
  );
}
