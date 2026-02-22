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
import { CONTACT_STATUS_OPTIONS } from "@/lib/constants";
import { Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  contactStatus: string | null;
  accountId: string | null;
  account: { id: string; name: string } | null;
  createdDate: string | null;
}

interface PaginatedResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobilePhone: "",
  title: "",
  department: "",
  contactStatus: "",
  accountId: "",
  personCountry: "",
};

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
  const [filterStatus, setFilterStatus] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  const fetchContacts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (filterStatus) params.set("contactStatus", filterStatus);
    const res = await fetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data: PaginatedResponse = await res.json();
      setContacts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
  }, [page, search, filterStatus]);

  const fetchAccounts = async () => {
    const res = await fetch("/api/accounts?page=1&sortBy=name");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.data?.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })) || []);
    }
  };

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { fetchAccounts(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`);
    if (res.ok) {
      const c = await res.json();
      setEditId(id);
      setForm({
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        phone: c.phone || "",
        mobilePhone: c.mobilePhone || "",
        title: c.title || "",
        department: c.department || "",
        contactStatus: c.contactStatus || "",
        accountId: c.accountId || "",
        personCountry: c.personCountry || "",
      });
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
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: editId ? "Contact updated" : "Contact created" });
      setShowDialog(false);
      fetchContacts();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Contact deleted" });
      fetchContacts();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search contacts..."
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
            {CONTACT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-[var(--muted-foreground)]">{total} contacts</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.account?.name}</TableCell>
              <TableCell>
                {c.contactStatus && (
                  <Badge variant={c.contactStatus === "Active" ? "default" : "secondary"}>
                    {c.contactStatus}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatDate(c.createdDate)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {contacts.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)]">
                No contacts found
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
            <DialogTitle>{editId ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>{editId ? "Update contact details." : "Create a new contact."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input value={form.mobilePhone} onChange={(e) => setForm({ ...form, mobilePhone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.contactStatus} onValueChange={(v) => setForm({ ...form, contactStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.personCountry} onChange={(e) => setForm({ ...form, personCountry: e.target.value })} />
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
