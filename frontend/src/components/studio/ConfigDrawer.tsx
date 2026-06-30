import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMX_FIELDS, type ColumnMapping, type FieldKey } from "@/lib/columnMapping";
import type { Separator, SupplierProfile } from "@/lib/supplierProfile";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Select value representing "no column assigned" (shadcn forbids empty values). */
const NONE = "__none__";

interface ConfigDrawerProps {
  /** Current supplier article-number rule. */
  profile: SupplierProfile;
  /** Called with the updated profile when prefix or separator changes. */
  onProfileChange: (profile: SupplierProfile) => void;
  /** Current field → column assignment. */
  mapping: ColumnMapping;
  /** Called with the updated mapping when a field's column changes. */
  onMappingChange: (mapping: ColumnMapping) => void;
  /** Source column headers from the active sheet. */
  headers: string[];
  /** A sample supplier number used for the live `→ BM-12345` example. */
  sampleNumber: string;
}

/**
 * Right drawer holding the supplier profile (prefix + separator with a live
 * resolved example) and the column-to-field mapping for each output type.
 */
export function ConfigDrawer({ profile, onProfileChange, mapping, onMappingChange, headers, sampleNumber }: ConfigDrawerProps) {
  const example = `${profile.prefix}${profile.separator}${sampleNumber || "12345"}`;

  function handleFieldChange(key: FieldKey, value: string) {
    onMappingChange({ ...mapping, [key]: value === NONE ? null : value });
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto px-2 flex-1">
      <section className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Supplier</p>
        <div className="flex gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-prefix" className="text-xs">
              Prefix
            </Label>
            <Input id="cfg-prefix" value={profile.prefix} maxLength={6} placeholder="BM, PS, RMS..." onChange={(e) => onProfileChange({ ...profile, prefix: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-sep" className="text-xs">
              Separator
            </Label>
            <Select value={profile.separator} onValueChange={(v) => onProfileChange({ ...profile, separator: v as Separator })}>
              <SelectTrigger id="cfg-sep" className="h-8 text-sm w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">( - )</SelectItem>
                <SelectItem value="">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center rounded-md bg-muted px-2 py-1.5">
          <p className="font-mono text-xs">
            → <span className="text-primary">{example}</span>
          </p>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-4 stroke-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-40 flex-col justify-center items-start">
              <p>New article numbers will be for example:</p>
              <p>{example}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Column mapping</p>
        {EMX_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`map-${field.key}`} className="text-xs">
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Select value={mapping[field.key] ?? NONE} onValueChange={(v) => handleFieldChange(field.key, v)}>
              <SelectTrigger id={`map-${field.key}`} className="h-8 text-xs w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {headers.map((header, i) => (
                  <SelectItem key={`${header}-${i}`} value={header}>
                    {header || `(column ${i + 1})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </section>
    </aside>
  );
}
