"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface Campaign {
  id: number;
  subject: string;
  status: string;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
  template: { name: string } | null;
  sender: { displayName: string; email: string };
  _count: { recipients: number };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCampaigns);
  }, []);

  const statusVariant = (status: string) => {
    switch (status) {
      case "sent": return "default" as const;
      case "sending": return "default" as const;
      case "draft": return "secondary" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Campaigns</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Sender</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.subject}</TableCell>
              <TableCell>{c.template?.name || "—"}</TableCell>
              <TableCell>{c.sender.displayName}</TableCell>
              <TableCell>{c._count.recipients || c.recipientCount}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
              </TableCell>
              <TableCell>{formatDate(c.sentAt)}</TableCell>
              <TableCell>{formatDate(c.createdAt)}</TableCell>
            </TableRow>
          ))}
          {campaigns.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)]">
                No campaigns yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
