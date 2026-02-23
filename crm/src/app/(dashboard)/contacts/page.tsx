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
import { CONTACT_STATUS_OPTIONS, ACCOUNT_STATUS_OPTIONS, INDUSTRY_OPTIONS } from "@/lib/constants";
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
  { key: "firstName", label: "First Name", defaultVisible: true },
  { key: "lastName", label: "Last Name", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "title", label: "Title", defaultVisible: true },
  { key: "accountName", label: "Account", defaultVisible: true },
  { key: "contactStatus", label: "Status", defaultVisible: true },
  { key: "createdDate", label: "Created", defaultVisible: true },
  { key: "phone", label: "Phone", defaultVisible: false },
  { key: "mobilePhone", label: "Mobile", defaultVisible: false },
  { key: "department", label: "Department", defaultVisible: false },
  { key: "salutation", label: "Salutation", defaultVisible: false },
  { key: "middleName", label: "Middle Name", defaultVisible: false },
  { key: "mailingCity", label: "City", defaultVisible: false },
  { key: "mailingState", label: "State", defaultVisible: false },
  { key: "mailingCountry", label: "Country", defaultVisible: false },
  { key: "leadSource", label: "Lead Source", defaultVisible: false },
  { key: "rating", label: "Rating", defaultVisible: false },
  { key: "personCountry", label: "Person Country", defaultVisible: false },
  { key: "executiveOrNot", label: "Executive", defaultVisible: false },
  { key: "worthFollowing", label: "Worth Following", defaultVisible: false },
  { key: "hasOptedOutOfEmail", label: "Opted Out", defaultVisible: false },
  { key: "doNotSendWhitepaper", label: "No Whitepaper", defaultVisible: false },
  { key: "description", label: "Description", defaultVisible: false },
  { key: "titleFormat", label: "Title Format", defaultVisible: false },
];

const FILTER_FIELDS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "title", label: "Title" },
  { value: "contactStatus", label: "Status" },
  { value: "phone", label: "Phone" },
  { value: "mobilePhone", label: "Mobile" },
  { value: "department", label: "Department" },
  { value: "mailingCity", label: "City" },
  { value: "mailingState", label: "State" },
  { value: "mailingCountry", label: "Country" },
  { value: "leadSource", label: "Lead Source" },
  { value: "rating", label: "Rating" },
  { value: "personCountry", label: "Person Country" },
  { value: "description", label: "Description" },
  { value: "titleFormat", label: "Title Format" },
];

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
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { current.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field); field = "";
        if (current.some((c) => c.trim())) lines.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field);
  if (current.some((c) => c.trim())) lines.push(current);

  return { headers: lines[0] || [], rows: lines.slice(1) };
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n"))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

// ── Types ───────────────────────────────────────────────────────────
interface Contact {
  [key: string]: unknown;
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  accountId: string | null;
  account: { id: string; name: string } | null;
}

interface PaginatedResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

interface AccountOption {
  id: string;
  name: string;
}

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "", mobilePhone: "",
  title: "", department: "", contactStatus: "", accountId: "", personCountry: "",
};

const IMPORTABLE_FIELDS = [
  { value: "", label: "— Skip —" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "mobilePhone", label: "Mobile" },
  { value: "title", label: "Title" },
  { value: "department", label: "Department" },
  { value: "salutation", label: "Salutation" },
  { value: "middleName", label: "Middle Name" },
  { value: "contactStatus", label: "Status" },
  { value: "leadSource", label: "Lead Source" },
  { value: "rating", label: "Rating" },
  { value: "personCountry", label: "Person Country" },
  { value: "mailingStreet", label: "Mailing Street" },
  { value: "mailingCity", label: "Mailing City" },
  { value: "mailingState", label: "Mailing State" },
  { value: "mailingPostalCode", label: "Mailing Postal Code" },
  { value: "mailingCountry", label: "Mailing Country" },
  { value: "description", label: "Description" },
  { value: "titleFormat", label: "Title Format" },
];

// ── Component ───────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // Account search (type-ahead)
  const [accountSearch, setAccountSearch] = useState("");
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Inline account creation
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ name: "", industry: "", accountStatus: "", phone: "" });

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

  // ── Data fetching ─────────────────────────────────────────────
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filters.length > 0) params.set("filters", JSON.stringify(filters));
    return params;
  }, [page, search, filters]);

  const fetchContacts = useCallback(async () => {
    const res = await fetch(`/api/contacts?${buildFilterParams()}`);
    if (res.ok) {
      const data: PaginatedResponse = await res.json();
      setContacts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
  }, [buildFilterParams]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Account type-ahead search
  useEffect(() => {
    const term = accountSearch.trim();
    if (term.length === 0) {
      fetch("/api/accounts?page=1&sortBy=name")
        .then((r) => r.ok ? r.json() : { data: [] })
        .then((d) => setAccountOptions(d.data?.map((a: AccountOption) => ({ id: a.id, name: a.name })) || []));
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/accounts?page=1&search=${encodeURIComponent(term)}&sortBy=name`)
        .then((r) => r.ok ? r.json() : { data: [] })
        .then((d) => setAccountOptions(d.data?.map((a: AccountOption) => ({ id: a.id, name: a.name })) || []));
    }, 250);
    return () => clearTimeout(timer);
  }, [accountSearch]);

  // Close account dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setAccountSearch("");
    setSelectedAccountName("");
    setShowDialog(true);
  };

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`);
    if (res.ok) {
      const c = await res.json();
      setEditId(id);
      setForm({
        firstName: c.firstName || "", lastName: c.lastName || "", email: c.email || "",
        phone: c.phone || "", mobilePhone: c.mobilePhone || "", title: c.title || "",
        department: c.department || "", contactStatus: c.contactStatus || "",
        accountId: c.accountId || "", personCountry: c.personCountry || "",
      });
      setSelectedAccountName(c.account?.name || "");
      setAccountSearch(c.account?.name || "");
      setShowDialog(true);
    }
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast({ title: "First name, last name, and email are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const url = editId ? `/api/contacts/${editId}` : "/api/contacts";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: editId ? "Contact updated" : "Contact created" });
      setShowDialog(false); fetchContacts();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Contact deleted" }); fetchContacts(); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  // ── Inline account creation ───────────────────────────────────
  const handleCreateAccount = async () => {
    if (!newAccountForm.name) {
      toast({ title: "Account name is required", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccountForm),
    });
    if (res.ok) {
      const acc = await res.json();
      toast({ title: "Account created" });
      setForm({ ...form, accountId: acc.id });
      setSelectedAccountName(acc.name);
      setAccountSearch(acc.name);
      setShowNewAccount(false);
      setNewAccountForm({ name: "", industry: "", accountStatus: "", phone: "" });
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  // ── Export CSV ────────────────────────────────────────────────
  const handleExport = async () => {
    const params = buildFilterParams();
    params.set("all", "true");
    const res = await fetch(`/api/contacts?${params}`);
    if (!res.ok) { toast({ title: "Export failed", variant: "destructive" }); return; }
    const { data } = await res.json() as { data: Contact[] };

    const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
    const headers = cols.map((c) => c.label);
    const rows = data.map((ct) =>
      cols.map((c) => {
        if (c.key === "accountName") return (ct.account as AccountOption | null)?.name || "";
        const v = ct[c.key];
        if (v === null || v === undefined) return "";
        if (c.key === "createdDate") return formatDate(v as string);
        if (typeof v === "boolean") return v ? "Yes" : "No";
        return String(v);
      })
    );

    const csv = toCSV(headers, rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${data.length} contacts` });
  };

  // ── Import CSV ────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
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
    let success = 0, failed = 0;
    for (const row of csvRows) {
      const body: Record<string, string> = {};
      for (const [colIdx, fieldKey] of Object.entries(fieldMapping)) {
        if (fieldKey && row[parseInt(colIdx)] !== undefined) {
          body[fieldKey] = row[parseInt(colIdx)].trim();
        }
      }
      if (!body.firstName || !body.lastName || !body.email) { failed++; continue; }
      const res = await fetch("/api/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) success++; else failed++;
    }
    setImporting(false);
    setShowImport(false);
    toast({ title: `Imported ${success} contacts` + (failed > 0 ? `, ${failed} failed` : "") });
    fetchContacts();
  };

  // ── Filter helpers ────────────────────────────────────────────
  const addFilter = () => setFilters([...filters, { field: "firstName", operator: "contains", value: "" }]);
  const removeFilter = (i: number) => { const next = [...filters]; next.splice(i, 1); setFilters(next); setPage(1); };
  const updateFilter = (i: number, patch: Partial<FilterRule>) => {
    const next = [...filters]; next[i] = { ...next[i], ...patch }; setFilters(next);
  };
  const applyFilters = () => { setPage(1); setShowFilterPanel(false); };

  // ── Column toggle ─────────────────────────────────────────────
  const toggleCol = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Render cell ───────────────────────────────────────────────
  const renderCell = (ct: Contact, col: ColumnDef) => {
    if (col.key === "accountName") return (ct.account as AccountOption | null)?.name || "";
    const v = ct[col.key];
    if (v === null || v === undefined) return "";
    if (col.key === "contactStatus") {
      return <Badge variant={v === "Active" ? "default" : "secondary"}>{String(v)}</Badge>;
    }
    if (col.key === "createdDate") return formatDate(v as string);
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input placeholder="Search contacts..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
        </form>
        <Button variant="outline" size="sm" onClick={() => setShowColDialog(true)}>
          <Columns3 className="mr-2 h-4 w-4" /> Columns
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowFilterPanel(!showFilterPanel)}>
          <Filter className="mr-2 h-4 w-4" /> Filters {filters.length > 0 && `(${filters.length})`}
        </Button>
        <span className="text-sm text-[var(--muted-foreground)]">{total} contacts</span>
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
          {filters.length > 0 && <Button size="sm" onClick={applyFilters}>Apply Filters</Button>}
          {filters.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No filters. Click Add to create one.</p>
          )}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((ct) => (
            <TableRow key={ct.id}>
              {visibleColumns.map((c) => (
                <TableCell key={c.key} className={c.key === "firstName" ? "font-medium" : ""}>
                  {renderCell(ct, c)}
                </TableCell>
              ))}
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(ct.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(ct.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1}
                className="text-center text-[var(--muted-foreground)]">No contacts found</TableCell>
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

      {/* ── Add/Edit contact dialog ──────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>{editId ? "Update contact details." : "Create a new contact."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Mobile</Label><Input value={form.mobilePhone} onChange={(e) => setForm({ ...form, mobilePhone: e.target.value })} /></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.contactStatus} onValueChange={(v) => setForm({ ...form, contactStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Searchable Account field */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Account</Label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs"
                  onClick={() => setShowNewAccount(true)}>
                  + Create New Account
                </Button>
              </div>
              <div className="relative" ref={accountDropdownRef}>
                <Input
                  placeholder="Type to search accounts..."
                  value={accountSearch}
                  onChange={(e) => {
                    setAccountSearch(e.target.value);
                    setShowAccountDropdown(true);
                    if (!e.target.value.trim()) {
                      setForm({ ...form, accountId: "" });
                      setSelectedAccountName("");
                    }
                  }}
                  onFocus={() => setShowAccountDropdown(true)}
                />
                {selectedAccountName && form.accountId && accountSearch === selectedAccountName && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    onClick={() => { setForm({ ...form, accountId: "" }); setSelectedAccountName(""); setAccountSearch(""); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {showAccountDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-[var(--popover)] shadow-md max-h-48 overflow-y-auto">
                    {accountOptions.length === 0 && (
                      <div className="p-2 text-sm text-[var(--muted-foreground)]">No accounts found</div>
                    )}
                    {accountOptions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-[var(--accent)] text-left"
                        onClick={() => {
                          setForm({ ...form, accountId: a.id });
                          setSelectedAccountName(a.name);
                          setAccountSearch(a.name);
                          setShowAccountDropdown(false);
                        }}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div><Label>Country</Label><Input value={form.personCountry} onChange={(e) => setForm({ ...form, personCountry: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{editId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline Account Creation popup ────────────────────────── */}
      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Create an account and link it to this contact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Account Name *</Label><Input value={newAccountForm.name} onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })} /></div>
            <div>
              <Label>Industry</Label>
              <Select value={newAccountForm.industry} onValueChange={(v) => setNewAccountForm({ ...newAccountForm, industry: v })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>{INDUSTRY_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={newAccountForm.accountStatus} onValueChange={(v) => setNewAccountForm({ ...newAccountForm, accountStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{ACCOUNT_STATUS_OPTIONS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={newAccountForm.phone} onChange={(e) => setNewAccountForm({ ...newAccountForm, phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAccount(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import mapping dialog ────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              {csvRows.length} row(s) found. Map each CSV column to a contact field.
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
