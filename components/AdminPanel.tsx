"use client";

import { FormEvent, useEffect, useState } from "react";
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
import type { Doc } from "@/convex/_generated/dataModel";
import EmployeeInvitePanel from "@/components/EmployeeInvitePanel";

type ProfileRole = "admin" | "chief" | "hrLead" | "hr" | "user";
type ProfileWithDepartment = Doc<"userProfiles"> & {
  department: Doc<"departments"> | null;
};

export default function AdminPanel() {
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
  const [domainDraft, setDomainDraft] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [checkingResend, setCheckingResend] = useState(false);
  const [resendCheckError, setResendCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.user) return;
    void ensureCurrentProfile();
  }, [ensureCurrentProfile, me?.user]);

  useEffect(() => {
    if (me?.companySettings?.domain) setDomainDraft(me.companySettings.domain);
  }, [me?.companySettings?.domain]);

  if (me === undefined) {
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
      const result = await correctCompanyDomain({ domain: domainDraft });
      toast.success(result.changed ? `Company domain changed to ${result.domain}` : "Company domain is unchanged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change company domain");
    } finally {
      setSavingDomain(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f5f0] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="border-b border-[#d9ddd6] pb-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#557066]">Workspace administration</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h1 className="text-3xl font-medium tracking-[-0.04em] text-[#20332b]">People & access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Assign departments, roles, and company email addresses. Sender
            addresses use <code>@{me?.companySettings?.domain ?? "your company domain"}</code>.
          </p>
          </div>
          <div className="border border-[#d9ddd6] bg-white px-4 py-2 text-sm text-[#52635b]">
            <span className="font-semibold text-[#20332b]">{emailRequests?.length ?? "—"}</span> pending address {emailRequests?.length === 1 ? "request" : "requests"}
          </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <Card className="rounded-none border-[#d9ddd6] bg-[#fbfbf8] shadow-none lg:sticky lg:top-6">
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
                          <p className="font-medium">{department.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {department.hrLeadName
                              ? `HR Lead: ${department.hrLeadName}`
                              : department.pendingHrLeadName
                                ? `HR Lead invitation pending: ${department.pendingHrLeadName}`
                                : "No HR Lead assigned"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
          {me?.companySettings?.isOwner && (
            <EmployeeInvitePanel domain={me.companySettings.domain} departments={departments ?? []} />
          )}
          {me?.companySettings?.isOwner && (
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
          {me?.companySettings?.isOwner && (
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
                        value={domainDraft}
                        onChange={(event) => setDomainDraft(event.target.value)}
                        placeholder="mail.example.com"
                        autoComplete="off"
                        spellCheck={false}
                        required
                      />
                    </div>
                    <Button type="submit" variant="outline" disabled={savingDomain || domainDraft.trim().toLowerCase() === me.companySettings.domain}>
                      {savingDomain ? "Saving…" : "Correct domain"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="rounded-none border-[#d9ddd6] shadow-none">
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
          </Card>

          <Card>
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
          </Card>
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
  departments: Doc<"departments">[];
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
  const hasChanges =
    role !== initialRole ||
    departmentId !== initialDepartmentId ||
    assignedEmail.trim() !== initialAssignedEmail;

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
            <SelectItem value="hrLead">HR Lead</SelectItem>
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
        <Button type="submit" form={`employee-${profile._id}`} disabled={!hasChanges}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}
