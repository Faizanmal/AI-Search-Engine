/**
 * ExportDialog — modal for exporting search history in various formats.
 *
 * Features
 * --------
 * - Format selection: JSON, Markdown, PDF
 * - Toggle to include/exclude sources
 * - Loading state with progress indication
 * - Triggers browser download via the useExportData hook
 */

'use client';

import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileJson, FileText, FileType, Loader2 } from 'lucide-react';
import { useExportData } from '@/hooks/use-search';
import { ExportFormat } from '@/types/search';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Format config
// ---------------------------------------------------------------------------
const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: 'json',
    label: 'JSON',
    description: 'Machine-readable structured data',
    icon: FileJson,
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Human-readable document format',
    icon: FileText,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Portable document for sharing / printing',
    icon: FileType,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ExportDialogInner({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeSources, setIncludeSources] = useState(true);
  const exportData = useExportData();

  const handleExport = useCallback(() => {
    exportData.mutate(
      { format, include_sources: includeSources },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }, [format, includeSources, exportData, onOpenChange]);

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[var(--ocean)]" />
            Export Search History
          </DialogTitle>
          <DialogDescription>
            Download your search history in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFormat && (
              <p className="text-xs text-muted-foreground">{selectedFormat.description}</p>
            )}
          </div>

          {/* Include sources toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-sources">Include Sources</Label>
              <p className="text-xs text-muted-foreground">
                Add citation URLs and snippets to the export
              </p>
            </div>
            <Switch
              id="include-sources"
              checked={includeSources}
              onCheckedChange={setIncludeSources}
              aria-label="Include sources in export"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportData.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportData.isPending}
            className="bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white"
          >
            {exportData.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ExportDialog = memo(ExportDialogInner);
ExportDialog.displayName = 'ExportDialog';
