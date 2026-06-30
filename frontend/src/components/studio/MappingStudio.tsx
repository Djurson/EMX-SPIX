import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetRail } from "./SheetRail";
import { MappingGrid } from "./MappingGrid";
import { ConfigDrawer } from "./ConfigDrawer";
import { guessMapping, isMappingComplete, type ColumnMapping } from "@/lib/columnMapping";
import { DEFAULT_PROFILES, type SupplierProfile } from "@/lib/supplierProfile";
import type { Workbook } from "@/lib/workbook";
import { Separator } from "@/components/ui/separator";

interface MappingStudioProps {
  /** The parsed workbook being mapped. */
  workbook: Workbook;
  /** Called when the user returns to the import screen. */
  onBack: () => void;
}

/**
 * Full-window 2-pane mapping workspace: sheet rail and supplier/column-mapping config drawer (left), read-only data, grid (center)
 */
export function MappingStudio({ workbook, onBack }: MappingStudioProps) {
  const [activeSheet, setActiveSheet] = useState(0);
  const sheet = workbook.sheets[activeSheet];

  const [mapping, setMapping] = useState<ColumnMapping>(() => guessMapping(sheet.headers));
  const [profile, setProfile] = useState<SupplierProfile>(DEFAULT_PROFILES[0]);

  function handleSelectSheet(index: number) {
    setActiveSheet(index);
    setMapping(guessMapping(workbook.sheets[index].headers));
  }

  const sampleNumber = useMemo(() => {
    const col = mapping.articleNumber ? sheet.headers.indexOf(mapping.articleNumber) : -1;
    return col >= 0 ? (sheet.rows[0]?.[col] ?? "") : "";
  }, [mapping.articleNumber, sheet]);

  const ready = isMappingComplete(mapping);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-4 py-2.5">
        <img src="src/assets/images/appicon.png" className="size-8" />
        <div className="leading-tight">
          <h1 className="text-sm font-bold tracking-tight">SPIX - Supplier Products Importer & Exporter</h1>
          <p className="text-xs text-muted-foreground">{workbook.fileName}</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onBack}>
          Change file
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-52 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-muted/30 p-2">
          <SheetRail sheets={workbook.sheets} active={activeSheet} onSelect={handleSelectSheet} />
          <Separator />
          <ConfigDrawer profile={profile} onProfileChange={setProfile} mapping={mapping} onMappingChange={setMapping} headers={sheet.headers} sampleNumber={sampleNumber} />
          <Separator />
          <Button size="sm" disabled={!ready}>
            Process {sheet.rows.length} →
          </Button>
        </nav>
        <MappingGrid sheet={sheet} />
      </div>
    </div>
  );
}
