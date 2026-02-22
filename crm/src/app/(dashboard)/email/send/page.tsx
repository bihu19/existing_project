"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { Send } from "lucide-react";

interface Sender {
  id: number;
  displayName: string;
  email: string;
  isActive: boolean;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  bodyHtml: string;
}

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export default function SendEmailPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [senderId, setSenderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [recipientIds, setRecipientIds] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/senders").then((r) => r.ok ? r.json() : []).then((data) => {
      const active = (Array.isArray(data) ? data : []).filter((s: Sender) => s.isActive);
      setSenders(active);
    });
    fetch("/api/templates").then((r) => r.ok ? r.json() : []).then(setTemplates);
    fetch("/api/contacts?page=1&sortBy=lastName").then((r) => r.ok ? r.json() : { data: [] }).then((d) => {
      setContacts(d.data || []);
    });
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === parseInt(id));
    if (t) {
      setSubject(t.subject);
      setBodyHtml(t.bodyHtml);
    }
  };

  const handleSend = async () => {
    if (!senderId || !subject) {
      toast({ title: "Sender and subject are required", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Create campaign
    const campaignRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: parseInt(senderId),
        templateId: templateId ? parseInt(templateId) : null,
        subject,
        recipientCount: recipientIds ? recipientIds.split(",").length : 0,
      }),
    });

    setLoading(false);
    if (campaignRes.ok) {
      toast({ title: "Campaign created", description: "Email campaign has been created as a draft." });
      setSenderId("");
      setTemplateId("");
      setSubject("");
      setBodyHtml("");
      setRecipientIds("");
    } else {
      const data = await campaignRes.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Send Email</h1>

      <div className="space-y-4">
        <div>
          <Label>From (Sender)</Label>
          <Select value={senderId} onValueChange={setSenderId}>
            <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
            <SelectContent>
              {senders.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.displayName} ({s.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Template (optional)</Label>
          <Select value={templateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger><SelectValue placeholder="Select a template or write from scratch" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Recipients</Label>
          <Select onValueChange={(v) => {
            const current = recipientIds ? recipientIds.split(",") : [];
            if (!current.includes(v)) {
              setRecipientIds([...current, v].join(","));
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Add recipients" /></SelectTrigger>
            <SelectContent>
              {contacts.filter((c) => c.email).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {recipientIds && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {recipientIds.split(",").length} recipient(s) selected
            </p>
          )}
        </div>

        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
        </div>

        <div>
          <Label>Body (HTML)</Label>
          <Textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={12}
            placeholder="<p>Hello {{first_name}},</p>"
          />
        </div>

        <Button onClick={handleSend} disabled={loading}>
          <Send className="mr-2 h-4 w-4" /> Create Campaign
        </Button>
      </div>
    </div>
  );
}
