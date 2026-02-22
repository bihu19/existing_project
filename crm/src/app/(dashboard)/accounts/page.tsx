"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  industry: string | null;
  accountStatus: string | null;
  phone: string | null;
  website: string | null;
  libPic: string | null;
  national: string | null;
  target: string | null;
  createdDate: string | null;
}

interface PaginatedResponse {
  data: Account[];
  total: number;
  page: number;
  totalPages: number;
}

const emptyForm = {
  name: "",
  industry: "",
  accountStatus: "",
  phone: "",
  website: "",
  libPic: "",
  national: "",
  target: "",
  description: "",
};

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
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");

  const fetchAccounts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filterStatus) params.set("accountStatus", filterStatus);
    if (filterIndustry) params.set("industry", filterIndustry);
    const res = await fetch(`/api/accounts?${params}`);
    if (res.ok) {
      const data: PaginatedResponse = await res.json();
      setAccounts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
  }, [page, search, filterStatus, filterIndustry]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/accounts/${id}`);
    if (res.ok) {
      const acc = await res.json();
      setEditId(id);
      setForm({
        name: acc.name || "",
        industry: acc.industry || "",
        accountStatus: acc.accountStatus || "",
        phone: acc.phone || "",
        website: acc.website || "",
        libPic: acc.libPic || "",
        national: acc.national || "",
        target: acc.target || "",
        description: acc.description || "",
      });
      setShowDialog(true);
    }
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const url = editId ? `/api/accounts/${editId}` : "/api/accounts";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: editId ? "Account updated" : "Account created" });
      setShowDialog(false);
      fetchAccounts();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Account deleted" });
      fetchAccounts();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ACCOUNT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIndustry} onValueChange={(v) => { setFilterIndustry(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-[var(--muted-foreground)]">{total} accounts</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>LiB PIC</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              <TableCell className="font-medium">{acc.name}</TableCell>
              <TableCell>{acc.industry}</TableCell>
              <TableCell>
                {acc.accountStatus && (
                  <Badge variant={acc.accountStatus === "Active" ? "default" : "secondary"}>
                    {acc.accountStatus}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{acc.phone}</TableCell>
              <TableCell>{acc.libPic}</TableCell>
              <TableCell>{formatDate(acc.createdDate)}</TableCell>
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
              <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)]">
                No accounts found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Account" : "Add Account"}</DialogTitle>
            <DialogDescription>{editId ? "Update account details." : "Create a new account."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.accountStatus} onValueChange={(v) => setForm({ ...form, accountStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <Label>LiB PIC</Label>
              <Input value={form.libPic} onChange={(e) => setForm({ ...form, libPic: e.target.value })} />
            </div>
            <div>
              <Label>National</Label>
              <Input value={form.national} onChange={(e) => setForm({ ...form, national: e.target.value })} />
            </div>
            <div>
              <Label>Target</Label>
              <Input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{editId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
