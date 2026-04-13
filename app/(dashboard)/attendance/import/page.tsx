"use client"

import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Upload, Loader2, CheckCircle2, XCircle, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CsvRow { employee_no: string; date: string; check_in: string; check_out: string }
interface ImportResult { row: number; success: boolean; error?: string; employeeNo?: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(",").map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim())
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = values[i] ?? "" })
    return obj as unknown as CsvRow
  })
}

async function previewImport(rows: CsvRow[]): Promise<{ preview: boolean; results: ImportResult[]; valid: number; total: number }> {
  const res = await fetch("/api/attendance/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, preview: true }),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function confirmImport(rows: CsvRow[]): Promise<{ imported: number; total: number; results: ImportResult[] }> {
  const res = await fetch("/api/attendance/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, preview: false }),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

function downloadTemplate() {
  const csv = "employee_no,date,check_in,check_out\nEMP001,2026-04-01,09:00,18:00\nEMP002,2026-04-01,09:30,17:30"
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "attendance_import_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export default function AttendanceImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fileName, setFileName] = useState("")
  const [preview, setPreview] = useState<{ results: ImportResult[]; valid: number; total: number } | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    setPreview(null)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRows(parseCsv(text))
    }
    reader.readAsText(file)
  }

  const previewMut = useMutation({
    mutationFn: previewImport,
    onSuccess: (data) => setPreview({ results: data.results, valid: data.valid, total: data.total }),
    onError: () => toast.error("Failed to validate CSV"),
  })

  const importMut = useMutation({
    mutationFn: confirmImport,
    onSuccess: (data) => {
      setImportResult({ imported: data.imported, total: data.total })
      toast.success(`Imported ${data.imported} of ${data.total} records`)
    },
    onError: () => toast.error("Import failed"),
  })

  const isDragOver = false // simplified - no drag state needed for basic version

  return (
    <div className="space-y-6">
      <PageHeader
        title="CSV Attendance Import"
        description="Import attendance records from any legacy system via CSV"
        actions={
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Download Template
          </Button>
        }
      />

      {/* Format info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-3 font-mono text-xs">
            employee_no,date,check_in,check_out<br />
            EMP001,2026-04-01,09:00,18:00<br />
            EMP002,2026-04-01,09:30,17:30
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Dates: YYYY-MM-DD · Times: HH:MM (24h) · check_out is optional
          </p>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors",
              "border-muted-foreground/25"
            )}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">{fileName || "Click to upload CSV file"}</p>
            {rows.length > 0 && <p className="text-xs text-muted-foreground mt-1">{rows.length} rows detected</p>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {rows.length > 0 && !importResult && (
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => previewMut.mutate(rows)}
                disabled={previewMut.isPending}
              >
                {previewMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <FileText className="h-4 w-4 mr-2" /> Validate
              </Button>
              {preview && preview.valid > 0 && (
                <Button
                  onClick={() => importMut.mutate(rows)}
                  disabled={importMut.isPending}
                >
                  {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Import {preview.valid} Valid Records
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import result */}
      {importResult && (
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="font-medium">Import Complete</p>
              <p className="text-sm text-muted-foreground">{importResult.imported} records imported out of {importResult.total}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation preview */}
      {preview && !importResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Validation Results — {preview.valid}/{preview.total} valid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee No</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.results.slice(0, 50).map(r => (
                    <tr key={r.row} className={r.success ? "" : "bg-red-50 dark:bg-red-950/20"}>
                      <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                      <td className="px-3 py-2">{r.employeeNo ?? rows[r.row - 1]?.employee_no}</td>
                      <td className="px-3 py-2">
                        {r.success ? (
                          <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Valid</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> {r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.results.length > 50 && (
                <p className="text-xs text-muted-foreground p-3">Showing first 50 rows of {preview.results.length}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
