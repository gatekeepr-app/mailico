"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/avatar";
import {
  canAccessAdminPage,
  canChangeRoles,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import EmployeeInvitePanel from "@/components/EmployeeInvitePanel";
import { authClient } from "@/lib/auth-client";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AdminSection = "overview" | "employees" | "departments" | "requests" | "settings";

type ProfileRole = "admin" | "chief" | "hrLead" | "hr" | "user";
type DepartmentSummary = Doc<"departments"> & {
  headTitle?: string;
  hrLeadName?: string;
  pendingHrLeadName?: string;
};
type ProfileWithDepartment = Doc<"userProfiles"> & {
  department: Doc<"departments"> | null;
};

export default function AdminPanel({ section = "overview" }: { section?: AdminSection }) {
  const me = useQuery(api.profiles.getMyProfile);
  const ensureCurrentProfile = useMutation(api.profiles.ensureCurrentProfile);
  const hasAdminPageAccess = canAccessAdminPage(me?.user?.email, me?.profile?.role);
  const userCanChangeRoles = canChangeRoles(me?.user?.email, me?.profile?.role);
  const profiles = usePaginatedQuery(
    api.profiles.listProfiles,
    hasAdminPageAccess ? {} : "skip",
    { initialNumItems: 25 },
  );
  const departments = useQuery(
    api.profiles.listDepartments,
    hasAdminPageAccess ? {} : "skip",
  );
  const emailRequests = useQuery(
    api.profiles.listEmailAddressRequests,
    hasAdminPageAccess ? {} : "skip",
  );
  const createDepartment = useMutation(api.profiles.createDepartment);
  const updateProfile = useMutation(api.profiles.updateProfileAssignment);
  const reviewEmailRequest = useMutation(api.profiles.reviewEmailAddressRequest);
  const correctCompanyDomain = useMutation(api.profiles.correctUnverifiedCompanyDomain);
  const [departmentName, setDepartmentName] = useState("");
  const [domainDraft, setDomainDraft] = useState<string | null>(null);
  const [savingDomain, setSavingDomain] = useState(false);
  const [checkingResend, setCheckingResend] = useState(false);
  const [resendCheckError, setResendCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.user) return;
    void ensureCurrentProfile();
  }, [ensureCurrentProfile, me?.user]);

  if (me == null) {
    return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;
  }

  if (!hasAdminPageAccess) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f0] px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              This page is available to the business owner, chief, and HR lead users.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!departmentName.trim()) return;
    try {
      await createDepartment({ name: departmentName });
      setDepartmentName("");
      toast.success("Department created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create department");
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profileId = form.get("profileId") as never;
    const role = form.get("role") as ProfileRole;
    const departmentValue = form.get("departmentId") as string;
    const assignedEmail = (form.get("assignedEmail") as string).trim();

    try {
      await updateProfile({
        profileId,
        role,
        departmentId: departmentValue ? (departmentValue as never) : undefined,
        assignedEmail: assignedEmail || undefined,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    }
  }

  async function handleReviewEmailRequest(requestId: string, decision: "approve" | "reject") {
    try {
      await reviewEmailRequest({ requestId: requestId as never, decision });
      toast.success(decision === "approve" ? "Company address approved" : "Request declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review the request");
    }
  }

  async function handleCheckResend() {
    setCheckingResend(true);
    setResendCheckError(null);
    try {
      const response = await fetch("/api/setup/resend-status", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not check Resend status.");
      toast.success(`Resend status: ${result.status.replaceAll("_", " ")}`);
    } catch (error) {
      setResendCheckError(error instanceof Error ? error.message : "Could not check Resend status.");
    } finally {
      setCheckingResend(false);
    }
  }

  async function handleCorrectDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDomain(true);
    try {
      const result = await correctCompanyDomain({ domain: domainDraft ?? me?.companySettings?.domain ?? "" });
      toast.success(result.changed ? `Company domain changed to ${result.domain}` : "Company domain is unchanged");
      setDomainDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change company domain");
    } finally {
      setSavingDomain(false);
    }
  }

  if (section === "overview") {
    const pendingRequests = emailRequests?.length ?? 0;
    const employeeCount = profiles.results?.length ?? 0;
    return (
      <main className="space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#557066]">Workspace overview</p><h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#20332b]">Good to see you, {me.profile?.name?.split(" ")[0] ?? "admin"}</h1><p className="mt-2 text-sm text-muted-foreground">Manage access and email for <strong>{me.companySettings?.domain}</strong>.</p></header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard label="Address requests" value={emailRequests === undefined ? "…" : String(pendingRequests)} detail="Waiting for review" href="/admin/requests" />
          <OverviewCard label="Employees" value={profiles.results === undefined ? "…" : String(employeeCount)} detail={profiles.status === "CanLoadMore" ? "First page loaded" : "Active directory"} href="/admin/employees" />
          <OverviewCard label="Departments" value={departments === undefined ? "…" : String(departments.length)} detail="Team organization" href="/admin/departments" />
          <OverviewCard label="Mail sending" value={me.companySettings?.resendStatus.replaceAll("_", " ") ?? "Unknown"} detail={me.companySettings?.domain ?? "Company domain"} href="/admin/settings" />
        </div>
        <Card className="rounded-none border-[#d9ddd6] shadow-none"><CardHeader><CardTitle>Admin shortcuts</CardTitle><CardDescription>Common workspace tasks</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Shortcut href="/admin/employees" title="Invite an employee" text="Add a team member and assign a company address."/><Shortcut href="/admin/requests" title="Review address requests" text="Approve or decline requested sender addresses."/><Shortcut href="/admin/departments" title="Manage departments" text="Organize employees and department HR Leads."/></CardContent></Card>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f5f0] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="border-b border-[#d9ddd6] pb-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#557066]">{section === "employees" ? "Team administration" : section === "departments" ? "Team structure" : section === "requests" ? "Access management" : "Workspace settings"}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h1 className="text-3xl font-medium tracking-[-0.04em] text-[#20332b]">{section === "employees" ? "Employees" : section === "departments" ? "Departments" : section === "requests" ? "Address requests" : "Mail settings"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {section === "employees"
              ? <>Assign roles, departments, and company email addresses using <code>@{me?.companySettings?.domain ?? "your company domain"}</code>.</>
              : section === "departments"
                ? "Create departments and track each department’s HR Lead."
                : section === "requests"
                  ? "Review employees’ requests for approved company email addresses."
                  : <>Resend status and sender domain for <code>{me?.companySettings?.domain ?? "your company domain"}</code>.</>}
          </p>
          </div>
          <div className="border border-[#d9ddd6] bg-white px-4 py-2 text-sm text-[#52635b]">
            <span className="font-semibold text-[#20332b]">{emailRequests?.length ?? "—"}</span> pending address {emailRequests?.length === 1 ? "request" : "requests"}
          </div>
          </div>
        </div>

        <div className="grid gap-6">
          {section === "departments" && <Card className="rounded-none border-[#d9ddd6] bg-[#fbfbf8] shadow-none lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Create and review department records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateDepartment} className="space-y-2">
                <Label htmlFor="department-name">New department</Label>
                <div className="flex gap-2">
                  <Input
                    id="department-name"
                    value={departmentName}
                    onChange={(event) => setDepartmentName(event.target.value)}
                    placeholder="Engineering"
                  />
                  <Button type="submit">Create</Button>
                </div>
              </form>

              <div className="space-y-2">
                <Label>Existing departments</Label>
                <div className="rounded-lg border bg-background">
                  {departments === undefined ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Loading…</p>
                  ) : departments.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No departments yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {departments.map((department) => (
                        <li key={department._id} className="px-3 py-2 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{department.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {department.hrLeadName
                                  ? `${department.headTitle ?? "Department head"}: ${department.hrLeadName}`
                                  : department.pendingHrLeadName
                                    ? `${department.headTitle ?? "Department head"} invitation pending: ${department.pendingHrLeadName}`
                                    : `No ${department.headTitle ?? "department head"} assigned`}
                              </p>
                            </div>
                            {userCanChangeRoles && (
                              <DepartmentEditor
                                departmentId={department._id}
                                initialName={department.name}
                                initialTitle={department.headTitle ?? "Department head"}
                              />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>}

          <div className="space-y-6">
          {section === "employees" && me?.companySettings?.isOwner && (
            <EmployeeInvitePanel domain={me.companySettings.domain} departments={departments ?? []} />
          )}
          {section === "settings" && me?.companySettings?.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Resend connection</CardTitle>
                <CardDescription>
                  Domain <strong>{me.companySettings.domain}</strong> · status <strong>{me.companySettings.resendStatus.replaceAll("_", " ")}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Mail sending is enabled only after the API key is accepted and this domain is verified for sending.</p>
                {resendCheckError && <p role="alert" className="text-sm text-destructive">{resendCheckError}</p>}
                <Button type="button" variant="outline" onClick={() => void handleCheckResend()} disabled={checkingResend}>
                  {checkingResend ? "Checking…" : "Check Resend status"}
                </Button>
              </CardContent>
            </Card>
          )}
          {section === "settings" && me?.companySettings?.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Correct an unverified domain</CardTitle>
                <CardDescription>
                  Use this after a setup typo. This is available only before Resend verifies the domain and before employee addresses, requests, or inbound mail for the owner address exist.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {me.companySettings.resendStatus === "verified" ? (
                  <p className="text-sm text-muted-foreground">This domain is verified. Changing it requires a planned domain migration.</p>
                ) : (
                  <form onSubmit={handleCorrectDomain} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="correct-company-domain">Company mail domain</Label>
                      <Input
                        id="correct-company-domain"
                        value={domainDraft ?? me.companySettings.domain}
                        onChange={(event) => setDomainDraft(event.target.value)}
                        placeholder="mail.example.com"
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>
                    <Button type="submit" variant="outline" disabled={savingDomain || (domainDraft ?? me.companySettings.domain).trim().toLowerCase() === me.companySettings.domain}>
                      {savingDomain ? "Saving…" : "Correct domain"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
          {section === "requests" && <Card className="rounded-none border-[#d9ddd6] shadow-none">
            <CardHeader className="border-b border-[#e5e8e1]">
              <div className="flex items-start justify-between gap-4">
              <div>
              <CardTitle>Address requests</CardTitle>
              <CardDescription>Review employee requests for a company sender address.</CardDescription>
              </div>
              <span className="min-w-8 border border-[#d9ddd6] px-2 py-1 text-center font-mono text-xs text-[#52635b]">{emailRequests?.length ?? "…"}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {emailRequests === undefined ? (
                <p className="text-sm text-muted-foreground">Loading requests…</p>
              ) : emailRequests.length === 0 ? (
                <div className="border border-dashed border-[#d9ddd6] px-5 py-8 text-center">
                  <p className="text-sm font-medium text-[#34463d]">You’re all caught up</p>
                  <p className="mt-1 text-xs text-muted-foreground">New company address requests will appear here.</p>
                </div>
              ) : emailRequests.map((request) => (
                <div key={request._id} className="flex flex-col gap-4 border border-[#e0e4dd] bg-[#fbfbf8] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={request.profile?.name ?? request.profile?.accountEmail ?? "Employee"} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{request.profile?.name ?? "Employee"}</p>
                      <p className="truncate text-xs text-muted-foreground">{request.profile?.accountEmail}</p>
                      <p className="mt-1 break-all text-sm font-semibold text-[#286653]">{request.requestedEmail}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" className="rounded-none bg-[#286653] text-white hover:bg-[#1f5544] active:scale-[0.98]" onClick={() => void handleReviewEmailRequest(request._id, "approve")}>Approve</Button>
                    <Button type="button" size="sm" variant="outline" className="rounded-none" onClick={() => void handleReviewEmailRequest(request._id, "reject")}>Decline</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>}

          {section === "employees" && <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
              Only {me?.companySettings?.ownerEmail ?? "the business owner"} can manage employee admin status. Chief can
                manage non-admin roles, departments, and company email
                assignments. HR lead can manage departments and company email
                assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-60">Employee</TableHead>
                    <TableHead className="min-w-36">Role</TableHead>
                    <TableHead className="min-w-44">Department</TableHead>
                    <TableHead className="min-w-64">Company email</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(profiles.results ?? []).map((profile) => (
                    <EmployeeRow
                      key={profile._id}
                      profile={profile as ProfileWithDepartment}
                      departments={departments ?? []}
                      domain={me?.companySettings?.domain ?? ""}
                      userCanChangeRoles={userCanChangeRoles}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </TableBody>
              </Table>
              {profiles.status === "CanLoadMore" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => profiles.loadMore(25)}
                  className="w-full"
                >
                  Load more employees
                </Button>
              )}
            </CardContent>
          </Card>}
          </div>
        </div>
      </div>
    </main>
  );
}

function EmployeeRow({
  profile,
  departments,
  domain,
  userCanChangeRoles,
  onUpdate,
}: {
  profile: ProfileWithDepartment;
  departments: DepartmentSummary[];
  domain: string;
  userCanChangeRoles: boolean;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [departmentId, setDepartmentId] = useState<string>(profile.departmentId ?? "none");
  const [assignedEmail, setAssignedEmail] = useState(
    profile.assignedEmail?.split("@")[0] ?? "",
  );
  const roleLocked = !userCanChangeRoles || profile.role === "admin";
  const initialRole = profile.role;
  const initialDepartmentId = profile.departmentId ?? "none";
  const initialAssignedEmail = profile.assignedEmail?.split("@")[0] ?? "";
  const departmentHeadTitle = departments.find((department) => department._id === departmentId)?.headTitle ?? "Department head";
  const [resetting, setResetting] = useState(false);
  const hasChanges =
    role !== initialRole ||
    departmentId !== initialDepartmentId ||
    assignedEmail.trim() !== initialAssignedEmail;

  async function sendReset() {
    setResetting(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: profile.accountEmail,
        redirectTo: "/login",
      });
      if (error) throw new Error(error.message ?? "Could not request a password reset.");
      toast.success("If the account exists, a password reset email has been sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request a password reset.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <form id={`employee-${profile._id}`} onSubmit={onUpdate}>
          <input type="hidden" name="profileId" value={profile._id} />
          <input type="hidden" name="role" value={role} />
          <input
            type="hidden"
            name="departmentId"
            value={departmentId === "none" ? "" : departmentId}
          />
        </form>
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.accountEmail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as ProfileRole)}
          disabled={roleLocked}
        >
          <SelectTrigger aria-label={`Role for ${profile.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="hrLead">{departmentHeadTitle}</SelectItem>
            <SelectItem value="chief">Chief</SelectItem>
            {profile.role === "hr" && <SelectItem value="hr">HR</SelectItem>}
            {profile.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger aria-label={`Department for ${profile.name}`}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department._id} value={department._id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex overflow-hidden rounded-lg border bg-background">
          <Input
            form={`employee-${profile._id}`}
            name="assignedEmail"
            value={assignedEmail}
            onChange={(event) => setAssignedEmail(event.target.value)}
            placeholder="firstname.lastname"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <span className="flex items-center border-l px-2 text-xs text-muted-foreground">
            @{domain}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={resetting} onClick={() => void sendReset()}>
            {resetting ? "Sending…" : "Reset password"}
          </Button>
          <Button type="submit" form={`employee-${profile._id}`} disabled={!hasChanges}>Save</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DepartmentEditor({ departmentId, initialName, initialTitle }: { departmentId: Id<"departments">; initialName: string; initialTitle: string }) {
  const updateDepartment = useMutation(api.profiles.updateDepartmentHeadTitle);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const unchanged = name.trim().replace(/\s+/g, " ") === initialName && title.trim().replace(/\s+/g, " ") === initialTitle;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateDepartment({ departmentId, name, title });
      setName(result.name);
      setTitle(result.headTitle);
      setOpen(false);
      toast.success("Department updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update department");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${initialName}`} title="Edit department">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit department</DialogTitle>
            <DialogDescription>Update the department name and the title used for its department lead.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`department-name-${departmentId}`}>Department name</Label>
              <Input id={`department-name-${departmentId}`} value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`department-title-${departmentId}`}>Department position</Label>
              <Input id={`department-title-${departmentId}`} value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || unchanged}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OverviewCard({ label, value, detail, href }: { label: string; value: string; detail: string; href: string }) {
  return <Link href={href} className="group border border-[#d9ddd6] bg-white p-5 transition-colors hover:border-[#286653]"><p className="text-xs font-medium uppercase tracking-wide text-[#718078]">{label}</p><p className="mt-3 text-2xl font-semibold capitalize text-[#20332b]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></Link>;
}

function Shortcut({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="border border-[#e0e4dd] bg-[#fbfbf8] p-4 hover:border-[#286653]"><p className="text-sm font-semibold text-[#20332b]">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></Link>;
}
