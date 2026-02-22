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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { FIELD_TYPE_OPTIONS } from "@/lib/constants";
import { Plus, Trash2 } from "lucide-react";

interface FieldDef {
  id: number;
  entity: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  optionsJson: string | null;
  isRequired: boolean;
  showInTable: boolean;
  sortOrder: number;
}

const emptyForm = {
  label: "",
  fieldType: "",
  optionsJson: "",
  isRequired: false,
  showInTable: false,
};

export default function FieldsPage() {
  const [entity, setEntity] = useState("account");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const fetchFields = async () => {
    const res = await fetch(`/api/fields?entity=${entity}`);
    if (res.ok) setFields(await res.json());
  };

  useEffect(() => { fetchFields(); }, [entity]);

  const handleAdd = async () => {
    if (!form.label || !form.fieldType) {
      toast({ title: "Label and field type are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    let optionsJson = undefined;
    if (form.fieldType === "dropdown" && form.optionsJson) {
      try {
        optionsJson = JSON.parse(form.optionsJson);
      } catch {
        toast({ title: "Invalid JSON for dropdown options", variant: "destructive" });
        setLoading(false);
        return;
      }
    }
    const res = await fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity,
        label: form.label,
        fieldType: form.fieldType,
        optionsJson,
        isRequired: form.isRequired,
        showInTable: form.showInTable,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Field created" });
      setShowAdd(false);
      setForm(emptyForm);
      fetchFields();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this custom field? All values will be lost.")) return;
    const res = await fetch(`/api/fields/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Field deleted" });
      fetchFields();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Custom Fields</h1>
        <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Field
        </Button>
      </div>

      <Tabs value={entity} onValueChange={setEntity}>
        <TabsList>
          <TabsTrigger value="account">Account Fields</TabsTrigger>
          <TabsTrigger value="contact">Contact Fields</TabsTrigger>
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>In Table</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.label}</TableCell>
              <TableCell className="text-[var(--muted-foreground)] text-xs font-mono">{f.fieldKey}</TableCell>
              <TableCell>{f.fieldType}</TableCell>
              <TableCell>
                {f.isRequired && <Badge variant="default">Required</Badge>}
              </TableCell>
              <TableCell>
                {f.showInTable && <Badge variant="secondary">Visible</Badge>}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-[var(--muted-foreground)]">
                No custom fields defined for {entity}s
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>Add a new custom field for {entity}s.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Contract Value" />
            </div>
            <div>
              <Label>Field Type</Label>
              <Select value={form.fieldType} onValueChange={(v) => setForm({ ...form, fieldType: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.fieldType === "dropdown" && (
              <div>
                <Label>Options (JSON array)</Label>
                <Input
                  value={form.optionsJson}
                  onChange={(e) => setForm({ ...form, optionsJson: e.target.value })}
                  placeholder='["Option A", "Option B"]'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
