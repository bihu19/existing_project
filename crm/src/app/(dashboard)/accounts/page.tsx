"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { ACCOUNT_STATUS_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/constants";
import {
  Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2,
  Download, Upload, Columns3, Filter, X,
} from "lucide-react";

// ── Column definitions ──────────────────────────────────────────────
interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", defaultVisible: true },
  { key: "industry", label: "Industry", defaultVisible: true },
  { key: "accountStatus", label: "Status", defaultVisible: true },
  { key: "phone", label: "Phone", defaultVisible: true },
  { key: "libPic", label: "LiB PIC", defaultVisible: true },
  { key: "createdDate", label: "Created", defaultVisible: true },
  { key: "type", label: "Type", defaultVisible: false },
  { key: "website", label: "Website", defaultVisible: false },
  { key: "billingCity", label: "City", defaultVisible: false },
  { key: "billingCountry", label: "Country", defaultVisible: false },
  { key: "annualRevenue", label: "Annual Revenue", defaultVisible: false },
  { key: "numberOfEmployees", label: "Employees", defaultVisible: false },
  { key: "rating", label: "Rating", defaultVisible: false },
  { key: "accountSource", label: "Source", defaultVisible: false },
  { key: "national", label: "National", defaultVisible: false },
  { key: "target", label: "Target", defaultVisible: false },
  { key: "highestTitle", label: "Highest Title", defaultVisible: false },
  { key: "numberOfProjects", label: "Projects", defaultVisible: false },
  { key: "totalRevenue", label: "Total Revenue", defaultVisible: false },
  { key: "execTouchpoint", label: "Exec Touchpoint", defaultVisible: false },
  { key: "supplyChain", label: "Supply Chain", defaultVisible: false },
  { key: "description", label: "Description", defaultVisible: false },
  { key: "note", label: "Note", defaultVisible: false },
  { key: "accountIdCustom", label: "Custom ID", defaultVisible: false },
  { key: "juristicId", label: "Juristic ID", defaultVisible: false },
];

// Fields available for filtering
const FILTER_FIELDS = ALL_COLUMNS.map((c) => ({ value: c.key, label: c.label }));

const FILTER_OPERATORS = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

// ── CSV helpers ─────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { current.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field);
        field = "";
        if (current.some((c) => c.trim())) lines.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field);
  if (current.some((c) => c.trim())) lines.push(current);

  const headers = lines[0] || [];
  const rows = lines.slice(1);
  return { headers, rows };
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

// ── Types ───────────────────────────────────────────────────────────
interface Account {
  [key: string]: unknown;
  id: string;
  name: string;
}

interface PaginatedResponse {
  data: Account[];
  total: number;
  page: number;
  totalPages: number;
}

interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

const emptyForm = {
  name: "", industry: "", accountStatus: "", phone: "", website: "",
  libPic: "", national: "", target: "", description: "",
};

// ── Importable field options (for mapping) ──────────────────────────
const IMPORTABLE_FIELDS = [
  { value: "", label: "— Skip —" },
  { value: "name", label: "Name" },
  { value: "type", label: "Type" },
  { value: "phone", label: "Phone" },
  { value: "website", label: "Website" },
  { value: "industry", label: "Industry" },
  { value: "annualRevenue", label: "Annual Revenue" },
  { value: "numberOfEmployees", label: "Employees" },
  { value: "description", label: "Description" },
  { value: "rating", label: "Rating" },
  { value: "accountSource", label: "Source" },
  { value: "accountStatus", label: "Status" },
  { value: "libPic", label: "LiB PIC" },
  { value: "national", label: "National" },
  { value: "target", label: "Target" },
  { value: "highestTitle", label: "Highest Title" },
  { value: "billingStreet", label: "Billing Street" },
  { value: "billingCity", label: "Billing City" },
  { value: "billingState", label: "Billing State" },
  { value: "billingPostalCode", label: "Billing Postal Code" },
  { value: "billingCountry", label: "Billing Country" },
  { value: "numberOfProjects", label: "Projects" },
  { value: "totalRevenue", label: "Total Revenue" },
  { value: "execTouchpoint", label: "Exec Touchpoint" },
  { value: "supplyChain", label: "Supply Chain" },
  { value: "note", label: "Note" },
  { value: "accountIdCustom", label: "Custom ID" },
  { value: "juristicId", label: "Juristic ID" },
];

// ── Component ───────────────────────────────────────────────────────
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [showColDialog, setShowColDialog] = useState(false);

  // Custom filters
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // CSV Import
  const [showImport, setShowImport] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filters.length > 0) params.set("filters", JSON.stringify(filters));
    return params;
  }, [page, search, filters]);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch(`/api/accounts?${buildFilterParams()}`);
    if (res.ok) {
      const data: PaginatedResponse = await res.json();
      setAccounts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
  }, [buildFilterParams]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── CRUD ────────────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/accounts/${id}`);
    if (res.ok) {
      const acc = await res.json();
      setEditId(id);
      setForm({
        name: acc.name || "", industry: acc.industry || "",
        accountStatus: acc.accountStatus || "", phone: acc.phone || "",
        website: acc.website || "", libPic: acc.libPic || "",
        national: acc.national || "", target: acc.target || "",
        description: acc.description || "",
      });
      setShowDialog(true);
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setLoading(true);
    const url = editId ? `/api/accounts/${editId}` : "/api/accounts";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: editId ? "Account updated" : "Account created" });
      setShowDialog(false); fetchAccounts();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Account deleted" }); fetchAccounts(); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  // ── Export CSV ──────────────────────────────────────────────────
  const handleExport = async () => {
    const params = buildFilterParams();
    params.set("all", "true");
    const res = await fetch(`/api/accounts?${params}`);
    if (!res.ok) { toast({ title: "Export failed", variant: "destructive" }); return; }
    const { data } = await res.json() as { data: Account[] };

    const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
    const headers = cols.map((c) => c.label);
    const rows = data.map((acc) =>
      cols.map((c) => {
        const v = acc[c.key];
        if (v === null || v === undefined) return "";
        if (c.key === "createdDate" || c.key === "lastModifiedDate") return formatDate(v as string);
        return String(v);
      })
    );

    const csv = toCSV(headers, rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${data.length} accounts` });
  };

  // ── Import CSV ─────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-map by matching header names to field labels/values
      const autoMap: Record<number, string> = {};
      headers.forEach((h, i) => {
        const lower = h.toLowerCase().trim();
        const match = IMPORTABLE_FIELDS.find(
          (f) => f.value && (f.value.toLowerCase() === lower || f.label.toLowerCase() === lower)
        );
        if (match) autoMap[i] = match.value;
      });
      setFieldMapping(autoMap);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const row of csvRows) {
      const body: Record<string, string> = {};
      for (const [colIdx, fieldKey] of Object.entries(fieldMapping)) {
        if (fieldKey && row[parseInt(colIdx)] !== undefined) {
          body[fieldKey] = row[parseInt(colIdx)].trim();
        }
      }
      if (!body.name) { failed++; continue; }
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) success++; else failed++;
    }
    setImporting(false);
    setShowImport(false);
    toast({ title: `Imported ${success} accounts` + (failed > 0 ? `, ${failed} failed` : "") });
    fetchAccounts();
  };

  // ── Filter helpers ─────────────────────────────────────────────
  const addFilter = () => setFilters([...filters, { field: "name", operator: "contains", value: "" }]);
  const removeFilter = (i: number) => { const next = [...filters]; next.splice(i, 1); setFilters(next); setPage(1); };
  const updateFilter = (i: number, patch: Partial<FilterRule>) => {
    const next = [...filters]; next[i] = { ...next[i], ...patch }; setFilters(next);
  };
  const applyFilters = () => { setPage(1); setShowFilterPanel(false); };

  // ── Column toggle ──────────────────────────────────────────────
  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Render cell value ─────────────────────────────────────────
  const renderCell = (acc: Account, col: ColumnDef) => {
    const v = acc[col.key];
    if (v === null || v === undefined) return "";
    if (col.key === "accountStatus") {
      return (
        <Badge variant={v === "Active" ? "default" : "secondary"}>{String(v)}</Badge>
      );
    }
    if (col.key === "createdDate" || col.key === "lastModifiedDate") {
      return formatDate(v as string);
    }
    return String(v);
  };

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {/* Search + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input placeholder="Search accounts..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
        </form>
        <Button variant="outline" size="sm" onClick={() => setShowColDialog(true)}>
          <Columns3 className="mr-2 h-4 w-4" /> Columns
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFilterPanel(!showFilterPanel)}>
          <Filter className="mr-2 h-4 w-4" /> Filters {filters.length > 0 && `(${filters.length})`}
        </Button>
        <span className="text-sm text-[var(--muted-foreground)]">{total} accounts</span>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Custom Filters</span>
            <Button size="sm" variant="outline" onClick={addFilter}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </div>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={f.field} onValueChange={(v) => updateFilter(i, { field: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTER_FIELDS.map((ff) => (
                    <SelectItem key={ff.value} value={ff.value}>{ff.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={f.operator} onValueChange={(v) => updateFilter(i, { operator: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTER_OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {f.operator !== "is_empty" && f.operator !== "is_not_empty" && (
                <Input value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })}
                  className="w-48" placeholder="Value..." />
              )}
              <Button size="icon" variant="ghost" onClick={() => removeFilter(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filters.length > 0 && (
            <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
          )}
          {filters.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No filters. Click Add to create one.</p>
          )}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              {visibleColumns.map((c) => (
                <TableCell key={c.key} className={c.key === "name" ? "font-medium" : ""}>
                  {renderCell(acc, c)}
                </TableCell>
              ))}
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(acc.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(acc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1}
                className="text-center text-[var(--muted-foreground)]">No accounts found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Column visibility dialog ─────────────────────────────── */}
      <Dialog open={showColDialog} onOpenChange={setShowColDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show / Hide Columns</DialogTitle>
            <DialogDescription>Select which columns to display in the table.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {ALL_COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={visibleCols.has(c.key)} onCheckedChange={() => toggleCol(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit dialog ──────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Account" : "Add Account"}</DialogTitle>
            <DialogDescription>{editId ? "Update account details." : "Create a new account."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>{INDUSTRY_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.accountStatus} onValueChange={(v) => setForm({ ...form, accountStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{ACCOUNT_STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div><Label>LiB PIC</Label><Input value={form.libPic} onChange={(e) => setForm({ ...form, libPic: e.target.value })} /></div>
            <div><Label>National</Label><Input value={form.national} onChange={(e) => setForm({ ...form, national: e.target.value })} /></div>
            <div><Label>Target</Label><Input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{editId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import mapping dialog ────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Accounts from CSV</DialogTitle>
            <DialogDescription>
              {csvRows.length} row(s) found. Map each CSV column to an account field.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {csvHeaders.map((header, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-48 truncate text-sm font-medium" title={header}>{header}</span>
                <span className="text-[var(--muted-foreground)]">&rarr;</span>
                <Select value={fieldMapping[i] || ""} onValueChange={(v) => setFieldMapping({ ...fieldMapping, [i]: v })}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="— Skip —" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORTABLE_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value || "skip"}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {csvRows[0] && (
                  <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]"
                    title={csvRows[0][i]}>e.g. {csvRows[0][i]}</span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${csvRows.length} rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
