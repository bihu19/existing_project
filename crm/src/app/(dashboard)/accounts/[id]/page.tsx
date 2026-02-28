"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Pencil, Globe, Phone, Building2, Users } from "lucide-react";

interface ContactSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  contactStatus: string | null;
}

interface CustomFieldValue {
  id: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: number | null;
  fieldDefinition: {
    label: string;
    fieldType: string;
    fieldKey: string;
  };
}

interface AccountDetail {
  id: string;
  name: string;
  type: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  annualRevenue: number | null;
  numberOfEmployees: number | null;
  description: string | null;
  rating: string | null;
  accountSource: string | null;
  accountStatus: string | null;
  libPic: string | null;
  national: string | null;
  target: string | null;
  highestTitle: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  execTouchpoint: string | null;
  supplyChain: string | null;
  numberOfProjects: number | null;
  totalRevenue: number | null;
  note: string | null;
  accountIdCustom: string | null;
  juristicId: string | null;
  createdDate: string | null;
  lastModifiedDate: string | null;
  parent: { id: string; name: string } | null;
  contacts: ContactSummary[];
  customFields: CustomFieldValue[];
}

// Detail row helper
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-[var(--border)]">
      <dt className="text-sm text-[var(--muted-foreground)]">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  );
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/accounts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setAccount)
      .catch(() => router.push("/accounts"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return <div className="p-6 text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (!account) return null;

  const address = [account.billingStreet, account.billingCity, account.billingState, account.billingPostalCode, account.billingCountry]
    .filter(Boolean)
    .join(", ");

  const formatCurrency = (v: number | null) => {
    if (v === null) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  };

  const renderCustomValue = (cf: CustomFieldValue) => {
    if (cf.fieldDefinition.fieldType === "boolean") return cf.valueBoolean ? "Yes" : "No";
    if (cf.fieldDefinition.fieldType === "number" || cf.fieldDefinition.fieldType === "integer") return cf.valueNumber?.toString() ?? "";
    return cf.valueText ?? "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/accounts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> {account.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {account.accountStatus && (
              <Badge variant={account.accountStatus === "Active" ? "default" : "secondary"}>
                {account.accountStatus}
              </Badge>
            )}
            {account.industry && (
              <span className="text-sm text-[var(--muted-foreground)]">{account.industry}</span>
            )}
          </div>
        </div>
        <Link href={`/accounts?edit=${account.id}`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {account.phone && (
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
              <Phone className="h-3 w-3" /> Phone
            </div>
            <div className="text-sm font-medium">{account.phone}</div>
          </div>
        )}
        {account.website && (
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
              <Globe className="h-3 w-3" /> Website
            </div>
            <div className="text-sm font-medium truncate">{account.website}</div>
          </div>
        )}
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
            <Users className="h-3 w-3" /> Contacts
          </div>
          <div className="text-sm font-medium">{account.contacts.length}</div>
        </div>
        {account.numberOfEmployees && (
          <div className="rounded-md border p-3">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Employees</div>
            <div className="text-sm font-medium">{account.numberOfEmployees.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Two-column layout: details + contacts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account details */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Account Details</h2>
          <dl>
            <DetailRow label="Name" value={account.name} />
            <DetailRow label="Type" value={account.type} />
            <DetailRow label="Industry" value={account.industry} />
            <DetailRow label="Status" value={account.accountStatus} />
            <DetailRow label="Rating" value={account.rating} />
            <DetailRow label="Source" value={account.accountSource} />
            <DetailRow label="Phone" value={account.phone} />
            <DetailRow label="Website" value={account.website} />
            <DetailRow label="Address" value={address || null} />
            <DetailRow label="LiB PIC" value={account.libPic} />
            <DetailRow label="National" value={account.national} />
            <DetailRow label="Target" value={account.target} />
            <DetailRow label="Highest Title" value={account.highestTitle} />
            <DetailRow label="Annual Revenue" value={formatCurrency(account.annualRevenue)} />
            <DetailRow label="Total Revenue" value={formatCurrency(account.totalRevenue)} />
            <DetailRow label="Employees" value={account.numberOfEmployees?.toLocaleString()} />
            <DetailRow label="Projects" value={account.numberOfProjects?.toString()} />
            <DetailRow label="Exec Touchpoint" value={account.execTouchpoint} />
            <DetailRow label="Supply Chain" value={account.supplyChain} />
            <DetailRow label="Parent Account" value={
              account.parent ? (
                <Link href={`/accounts/${account.parent.id}`} className="text-[var(--primary)] underline">
                  {account.parent.name}
                </Link>
              ) : null
            } />
            <DetailRow label="Custom ID" value={account.accountIdCustom} />
            <DetailRow label="Juristic ID" value={account.juristicId} />
            <DetailRow label="Created" value={formatDate(account.createdDate)} />
            <DetailRow label="Modified" value={formatDate(account.lastModifiedDate)} />
            {account.customFields.map((cf) => (
              <DetailRow key={cf.id} label={cf.fieldDefinition.label} value={renderCustomValue(cf)} />
            ))}
          </dl>

          {account.description && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{account.description}</p>
            </div>
          )}
          {account.note && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Note</h3>
              <p className="text-sm whitespace-pre-wrap">{account.note}</p>
            </div>
          )}
        </div>

        {/* Linked contacts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Contact Persons ({account.contacts.length})
            </h2>
            <Link href={`/contacts?accountId=${account.id}`}>
              <Button variant="outline" size="sm">View All in Contacts</Button>
            </Link>
          </div>

          {account.contacts.length === 0 ? (
            <div className="rounded-md border p-6 text-center text-[var(--muted-foreground)]">
              No contacts linked to this account yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.department}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      {c.contactStatus && (
                        <Badge variant={c.contactStatus === "Active" ? "default" : "secondary"}>
                          {c.contactStatus}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
