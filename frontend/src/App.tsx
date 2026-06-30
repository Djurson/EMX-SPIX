import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SpreadsheetPicker, type SelectedSpreadsheet } from "@/components/SpreadsheetPicker";
import { MappingStudio } from "@/components/studio/MappingStudio";
import { toWorkbook } from "@/lib/workbook";

export default function App() {
  const [file, setFile] = useState<SelectedSpreadsheet | null>(null);
  const [inStudio, setInStudio] = useState(false);

  if (inStudio && file) return <MappingStudio workbook={toWorkbook(file)} onBack={() => setInStudio(false)} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg space-y-2">
        <div className="flex items-center gap-2">
          <img src="src/assets/images/appicon.png" className="size-24" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">SPIX</h1>
            <p className="text-sm text-muted-foreground">Supplier Products Importer &amp; Exporter</p>
          </div>
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <CardTitle className="text-base">Import spreadsheet</CardTitle>
            <CardDescription>Upload an Excel or CSV file to extract part numbers, descriptions and images.</CardDescription>
          </CardHeader>

          <CardContent className="py-6">
            <SpreadsheetPicker value={file} onChange={setFile} />
          </CardContent>

          <CardFooter className="justify-end border-t py-4">
            <Button disabled={!file} onClick={() => setInStudio(true)}>
              Open in studio
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
