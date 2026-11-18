"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EmployeeRole = "user" | "hrLead";
type InviteDepartment = Doc<"departments"> & { headTitle?: string };

export default function EmployeeInvitePanel({
  domain,
  departments,
}: {
  domain: string;
  departments: InviteDepartment[];
}) {
  const invitations = useQuery(api.profiles.listEmployeeInvitations);
  const cancelInvitation = useMutation(api.profiles.cancelEmployeeInvitation);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [assignedLocalPart, setAssignedLocalPart] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState<EmployeeRole>("user");
  const [sending, setSending] = useState(false);
  const headTitle = departments.find((department) => department._id === departmentId)?.headTitle ?? "Department head";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!departmentId) {
      toast.error("Create a department before inviting an employee.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/admin/employee-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, accountEmail, assignedLocalPart, departmentId, role }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not send the employee invitation.");
      setName("");
      setAccountEmail("");
      setAssignedLocalPart("");
      setDepartmentId("");
      setRole("user");
      setOpen(false);
      toast.success("Password setup invitation sent to the primary email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the employee invitation.");
    } finally {
      setSending(false);
    }
  }

  async function cancel(invitationId: Id<"employeeInvitations">) {
    try {
      await cancelInvitation({ invitationId });
      toast.success("Invitation cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the invitation");
    }
  }

  return (
    <section className="min-w-0 space-y-5" aria-label="Employee invitations">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#20332b]">Employee access</h2>
          <p className="mt-1 text-sm text-[#718078]">Invite employees and manage outstanding setup links.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="min-h-10 shrink-0 rounded-none bg-[#286653] text-white hover:bg-[#1f5544]" disabled={departments.length === 0}>
              <Plus className="size-4" />
              Invite an employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <form onSubmit={submit} className="space-y-5">
              <DialogHeader>
                <DialogTitle>Invite an employee</DialogTitle>
                <DialogDescription>
                  Send a password setup link to the employee’s primary email. They will verify that email while creating their account.
                </DialogDescription>
              </DialogHeader>
              {departments.length === 0 ? (
                <p className="border border-dashed border-[#d9ddd6] p-4 text-sm text-muted-foreground">Create a department before inviting employees.</p>
              ) : (
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="invite-employee-name">Employee name</Label>
                    <Input id="invite-employee-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="invite-account-email">Primary delivery email</Label>
                    <Input id="invite-account-email" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} autoComplete="email" required />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="invite-company-email">Company email address</Label>
                    <div className="flex min-w-0 overflow-hidden border bg-background">
                      <Input id="invite-company-email" value={assignedLocalPart} onChange={(event) => setAssignedLocalPart(event.target.value)} placeholder="first.last" className="min-w-0 border-0 shadow-none focus-visible:ring-0" required />
                      <span className="flex max-w-[55%] items-center break-all border-l px-2 text-xs text-muted-foreground">@{domain}</span>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="invite-department">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger id="invite-department"><SelectValue placeholder="Choose a department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => <SelectItem key={department._id} value={department._id}>{department.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid min-w-0 gap-2 sm:col-span-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as EmployeeRole)}>
                      <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Employee</SelectItem>
                        <SelectItem value="hrLead">{headTitle}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Each department has one {headTitle}. This person can review mail sent by employees in that department.</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={sending || !departmentId || departments.length === 0} className="rounded-none bg-[#286653] text-white hover:bg-[#1f5544]">
                  {sending ? "Sending setup link…" : "Send password setup link"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(invitations?.length ?? 0) > 0 && (
        <div aria-label="Pending employee invitations" className="min-w-0 border-t border-[#d9ddd6] pt-4">
          <h3 className="text-sm font-medium text-[#34463d]">Pending invitations</h3>
          <ul className="mt-2 divide-y divide-[#e0e4dd]">
            {invitations?.map((invitation) => (
              <li key={invitation._id} className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.name}</p>
                  <p className="break-all text-xs text-muted-foreground">{invitation.accountEmail}</p>
                  <p className="break-words text-xs text-[#286653]">{invitation.assignedEmail} · {invitation.department?.name ?? "Department removed"} · {invitation.role === "hrLead" ? "HR Lead" : "Employee"}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="min-h-9 shrink-0 self-start sm:self-auto" onClick={() => void cancel(invitation._id)}>Cancel invitation</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
