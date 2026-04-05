'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UploadIcon, Loader2Icon, FileSpreadsheetIcon, CheckCircle2Icon } from 'lucide-react';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportResult {
  imported: number;
  holdings: { symbol: string; name: string; quantity: number; avg_price: number }[];
}

export default function CSVImportDialog({ open, onOpenChange, onSuccess }: CSVImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setResult(null);
    }
  }

  async function handleImport() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (replaceExisting) {
        formData.append('replace', 'true');
      }

      const res = await fetch('/api/portfolio/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import failed');
        return;
      }

      setResult(data);
      onSuccess();
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setFile(null);
      setError(null);
      setResult(null);
      setReplaceExisting(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Holdings from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file exported from your broker (Zerodha, Groww, Angel One, etc.)
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2Icon className="size-5" />
              <span className="font-medium">
                Successfully imported {result.imported} holding{result.imported !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Symbol</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.holdings.map((h, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 font-medium">{h.symbol}</td>
                      <td className="p-2 text-right">{h.quantity}</td>
                      <td className="p-2 text-right">{h.avg_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File upload area */}
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <FileSpreadsheetIcon className="size-8 text-green-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <UploadIcon className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select CSV file</p>
                  <p className="text-xs text-muted-foreground">
                    Supports Zerodha, Groww, Angel One, Upstox, FYERS formats
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Replace option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replace-existing"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="replace-existing" className="text-sm font-normal">
                Replace existing CSV-imported holdings
              </Label>
            </div>

            {/* Expected format hint */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Expected CSV columns:</p>
              <p>Symbol (required), Quantity (required), Avg Price (required)</p>
              <p>Optional: Name, Exchange</p>
              <p className="mt-1 italic">
                Column names are matched flexibly — most broker export formats are supported.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file || uploading} className="gap-1.5">
                {uploading ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-3.5" />
                    Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
