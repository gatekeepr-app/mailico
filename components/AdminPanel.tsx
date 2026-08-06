"use client";

import { FormEvent, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DOMAIN = "mail.darvizlabs.online";

export default function AdminPanel() {
  const me = useQuery(api.profiles.getMyProfile);
  const isStaff = me?.profile?.role === "admin" || me?.profile?.role === "hr";
  const profiles = usePaginatedQuery(
    api.profiles.listProfiles,
    isStaff ? {} : "skip",
    { initialNumItems: 25 },
  );
  const departments = useQuery(api.profiles.listDepartments, isStaff ? {} : "skip");
  const createDepartment = useMutation(api.profiles.createDepartment);
  const updateProfile = useMutation(api.profiles.updateProfileAssignment);
  const [departmentName, setDepartmentName] = useState("");

  if (me === undefined) {
    return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;
  }

  if (!isStaff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Staff access required</CardTitle>
            <CardDescription>
              Admin or HR role is required to manage people and email assignments.
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
    const role = form.get("role") as "admin" | "hr" | "user";
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mailico</p>
          <h1 className="text-3xl font-semibold tracking-tight">People</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Assign departments, roles, and company email addresses. Sender
            addresses always use <code>@{DOMAIN}</code>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Create simple department records.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDepartment} className="flex gap-2">
              <Input
                value={departmentName}
                onChange={(event) => setDepartmentName(event.target.value)}
                placeholder="Engineering, HR, Sales"
              />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <CardDescription>
              The first registered profile is bootstrapped as admin. HR can
              assign users and departments but cannot manage admin access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(profiles.results ?? []).map((profile) => (
              <form
                key={profile._id}
                onSubmit={handleUpdate}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.4fr_0.8fr_1fr_1.2fr_auto] md:items-end"
              >
                <input type="hidden" name="profileId" value={profile._id} />
                <div>
                  <Label>Name</Label>
                  <p className="mt-2 text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.accountEmail}
                  </p>
                </div>
                <div>
                  <Label htmlFor={`role-${profile._id}`}>Role</Label>
                  <select
                    id={`role-${profile._id}`}
                    name="role"
                    defaultValue={profile.role}
                    className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="hr">HR</option>
                    {me.profile?.role === "admin" && (
                      <option value="admin">Admin</option>
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`dept-${profile._id}`}>Department</Label>
                  <select
                    id={`dept-${profile._id}`}
                    name="departmentId"
                    defaultValue={profile.departmentId ?? ""}
                    className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="">None</option>
                    {(departments ?? []).map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`email-${profile._id}`}>Company email</Label>
                  <div className="mt-2 flex overflow-hidden rounded-lg border bg-background">
                    <Input
                      id={`email-${profile._id}`}
                      name="assignedEmail"
                      defaultValue={profile.assignedEmail?.split("@")[0] ?? ""}
                      placeholder="firstname.lastname"
                      className="border-0 shadow-none focus-visible:ring-0"
                    />
                    <span className="flex items-center border-l px-2 text-xs text-muted-foreground">
                      @{DOMAIN}
                    </span>
                  </div>
                </div>
                <Button type="submit">Save</Button>
              </form>
            ))}
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
    </main>
  );
}
