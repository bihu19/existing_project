"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { Plus, TestTube } from "lucide-react";

interface Sender {
  id: number;
  displayName: string;
  email: string;
  smtpUser: string;
  isActive: boolean;
  createdAt: string;
}

export default function SendersPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    smtpUser: "",
    smtpPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchSenders = async () => {
    const res = await fetch("/api/senders");
    if (res.ok) setSenders(await res.json());
  };

  useEffect(() => { fetchSenders(); }, []);

  const handleAdd = async () => {
    setLoading(true);
    const res = await fetch("/api/senders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Sender added" });
      setShowAdd(false);
      setForm({ displayName: "", email: "", smtpUser: "", smtpPassword: "" });
      fetchSenders();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const toggleActive = async (sender: Sender) => {
    const res = await fetch(`/api/senders/${sender.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sender.isActive }),
    });
    if (res.ok) {
      toast({ title: sender.isActive ? "Sender disabled" : "Sender enabled" });
      fetchSenders();
    }
  };

  const testConnection = async (sender: Sender) => {
    setLoading(true);
    const res = await fetch(`/api/senders/${sender.id}/test`, { method: "POST" });
    setLoading(false);
    const data = await res.json();
    if (res.ok) {
      toast({ title: "Connection successful", description: "Test email sent" });
    } else {
      toast({ title: "Connection failed", description: data.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Senders</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Sender
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>SMTP User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {senders.map((sender) => (
            <TableRow key={sender.id}>
              <TableCell className="font-medium">{sender.displayName}</TableCell>
              <TableCell>{sender.email}</TableCell>
              <TableCell>{sender.smtpUser}</TableCell>
              <TableCell>
                <Badge variant={sender.isActive ? "default" : "secondary"}>
                  {sender.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(sender)}>
                    {sender.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => testConnection(sender)} disabled={loading}>
                    <TestTube className="mr-1 h-3 w-3" /> Test
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Email Sender</DialogTitle>
            <DialogDescription>Register a Gmail account for sending emails.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Puay - LiB Consulting" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="puay@libconsulting.com" />
            </div>
            <div>
              <Label>SMTP User (Gmail)</Label>
              <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} placeholder="puay@gmail.com" />
            </div>
            <div>
              <Label>Gmail App Password</Label>
              <Input type="password" value={form.smtpPassword} onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>Add Sender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
