"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/avatar";
import {
  ADMIN_EMAIL,
  canAccessAdminPage,
  canChangeRoles,
  isAdminEmail,
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

const DOMAIN = "mail.darvizlabs.online";
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
  const createDepartment = useMutation(api.profiles.createDepartment);
  const updateProfile = useMutation(api.profiles.updateProfileAssignment);
  const [departmentName, setDepartmentName] = useState("");

  useEffect(() => {
    if (!me?.user) return;
    void ensureCurrentProfile();
  }, [ensureCurrentProfile, me?.user]);

  if (me === undefined) {
    return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;
  }

  if (!hasAdminPageAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              This page is available to {ADMIN_EMAIL}, chief, and HR lead users.
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

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mailico</p>
          <h1 className="text-3xl font-semibold tracking-tight">People</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Assign departments, roles, and company email addresses. Sender
            addresses always use <code>@{DOMAIN}</code>.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <Card className="lg:sticky lg:top-6">
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
                        <li key={department._id} className="px-3 py-2 text-sm font-medium">
                          {department.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Only {ADMIN_EMAIL} can manage employee admin status. Chief can
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
    </main>
  );
}

function EmployeeRow({
  profile,
  departments,
  userCanChangeRoles,
  onUpdate,
}: {
  profile: ProfileWithDepartment;
  departments: Doc<"departments">[];
  userCanChangeRoles: boolean;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [departmentId, setDepartmentId] = useState<string>(profile.departmentId ?? "none");
  const [assignedEmail, setAssignedEmail] = useState(
    profile.assignedEmail?.split("@")[0] ?? "",
  );
  const roleLocked = !userCanChangeRoles || isAdminEmail(profile.accountEmail);
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
            {isAdminEmail(profile.accountEmail) && <SelectItem value="admin">Admin</SelectItem>}
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
            @{DOMAIN}
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
