"use client";

import { useMemo, useState } from "react";
import { Download, Search, Table2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toCSV, reportFilename, type ReportTable, type CellValue } from "@/lib/reports";

// A table view for any report the catalog can produce. Deliberately generic:
// reports differ in their columns, not in how a person reads or exports them.

function download(csv: string, filename: string) {
  // A BOM makes Excel read the file as UTF-8; without it accented names mojibake.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Numeric-aware compare so "10" sorts after "9" rather than before it. */
function compare(a: CellValue, b: CellValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;   // blanks sink, in either direction
  if (b == null) return -1;

  const na = typeof a === "number" ? a : Number(String(a).replace(/[$,%\s]/g, ""));
  const nb = typeof b === "number" ? b : Number(String(b).replace(/[$,%\s]/g, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;

  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

interface Props {
  title: string;
  description?: string;
  table: ReportTable;
  canExport?: boolean;
}

export function ReportViewer({ title, description, table, canExport = true }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? table.rows.filter((r) =>
          table.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)))
      : table.rows;

    if (sort) {
      out = [...out].sort((a, b) => {
        const res = compare(a[sort.key], b[sort.key]);
        return sort.dir === "asc" ? res : -res;
      });
    }
    return out;
  }, [table, query, sort]);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          {table.summary && (
            <p className="text-xs text-muted-foreground/80 mt-1 tabular-nums">{table.summary}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="h-9 w-40 pl-8 text-sm"
              aria-label={`Filter ${title}`}
            />
          </div>
          {canExport && (
            <Button
              size="sm" variant="outline"
              disabled={rows.length === 0}
              onClick={() => download(toCSV({ ...table, rows }), reportFilename(title))}
              title={rows.length === 0 ? "Nothing to export" : `Export ${rows.length} rows`}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          )}
        </div>
      </div>

      {table.rows.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="Nothing to report"
          description="There's no data in this period for this report."
          hint="Try a wider date range."
          compact
        />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No rows match “{query}”.
        </p>
      ) : (
        // Wide tables scroll inside their own container so the page body never does.
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border">
                {table.columns.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={cn(
                        "py-2 px-2 font-medium text-muted-foreground whitespace-nowrap",
                        c.numeric ? "text-right" : "text-left"
                      )}
                    >
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 min-h-[28px] hover:text-foreground transition-colors",
                          active && "text-foreground"
                        )}
                      >
                        {c.label}
                        <ArrowUpDown className={cn("h-3 w-3 shrink-0", active ? "opacity-100" : "opacity-40")} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-foreground/[0.02]">
                  {table.columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "py-2 px-2 text-foreground",
                        c.numeric ? "text-right tabular-nums" : "text-left"
                      )}
                    >
                      {r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
