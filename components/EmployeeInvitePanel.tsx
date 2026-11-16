"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmployeeRole = "user" | "hrLead";

export default function EmployeeInvitePanel({
  domain,
  departments,
}: {
  domain: string;
  departments: Doc<"departments">[];
}) {
  const invitations = useQuery(api.profiles.listEmployeeInvitations);
  const cancelInvitation = useMutation(api.profiles.cancelEmployeeInvitation);
  const [name, setName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [assignedLocalPart, setAssignedLocalPart] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState<EmployeeRole>("user");
  const [sending, setSending] = useState(false);

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
        body: JSON.stringify({
          name,
          accountEmail,
          assignedLocalPart,
          departmentId,
          role,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not send the employee invitation.");
      setName("");
      setAccountEmail("");
      setAssignedLocalPart("");
      toast.success("Invitation sent. The employee must verify their email and create a password.");
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
    <Card className="rounded-none border-[#d9ddd6] shadow-none">
      <CardHeader>
        <CardTitle>Invite an employee</CardTitle>
        <CardDescription>
          Send an invitation to the employee’s real email. They’ll set a password, verify that email, and receive the company address below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {departments.length === 0 ? (
          <p className="border border-dashed p-4 text-sm text-muted-foreground">Create a department first, then invite its employees and HR Lead.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="invite-employee-name">Employee name</Label>
              <Input id="invite-employee-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-account-email">Real email address</Label>
              <Input id="invite-account-email" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-company-email">Company email address</Label>
              <div className="flex min-w-0 overflow-hidden border bg-background">
                <Input id="invite-company-email" value={assignedLocalPart} onChange={(event) => setAssignedLocalPart(event.target.value)} placeholder="first.last" className="min-w-0 border-0 shadow-none focus-visible:ring-0" required />
                <span className="flex max-w-[55%] items-center break-all border-l px-2 text-xs text-muted-foreground">@{domain}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-department">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="invite-department"><SelectValue placeholder="Choose a department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((department) => <SelectItem key={department._id} value={department._id}>{department.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as EmployeeRole)}>
                <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Employee</SelectItem>
                  <SelectItem value="hrLead">Department HR Lead</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Each department can have one HR Lead. That person can review all sent mail from their department.</p>
            </div>
            <Button type="submit" disabled={sending || !departmentId} className="min-h-11 rounded-none bg-[#286653] text-white hover:bg-[#1f5544] sm:col-span-2 sm:justify-self-start">
              {sending ? "Sending invitation…" : "Send employee invitation"}
            </Button>
          </form>
        )}

        {(invitations?.length ?? 0) > 0 && (
          <section aria-label="Pending employee invitations" className="space-y-2 border-t border-[#e5e8e1] pt-4">
            <h3 className="text-sm font-medium text-[#34463d]">Pending invitations</h3>
            {invitations?.map((invitation) => (
              <div key={invitation._id} className="flex flex-col gap-3 border border-[#e0e4dd] bg-[#fbfbf8] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.name}</p>
                  <p className="break-all text-xs text-muted-foreground">{invitation.accountEmail}</p>
                  <p className="break-all text-xs text-[#286653]">{invitation.assignedEmail} · {invitation.department?.name ?? "Department removed"} · {invitation.role === "hrLead" ? "HR Lead" : "Employee"}</p>
                </div>
                <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void cancel(invitation._id)}>Cancel invitation</Button>
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
