"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import EmailList from "@/components/EmailList";
import EmailView from "@/components/EmailView";
import ComposeModal from "@/components/ComposeModal";
import {
  buildFromAddress,
  groupEmailsIntoThreads,
  isValidEmail,
  uid,
} from "@/lib/mail";
import { authClient } from "@/lib/auth-client";
import { canAccessAdminPage } from "@/lib/admin";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  EMPTY_COMPOSE,
  type ComposeState,
  type Email,
  type FolderKey,
} from "@/lib/types";

export default function MailApp() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const ensureCurrentProfile = useMutation(api.profiles.ensureCurrentProfile);
  const profileData = useQuery(api.profiles.getMyProfile);
  const configuredHeadTitle = profileData?.department?.headTitle?.trim();
  const departmentSentLabel = configuredHeadTitle && configuredHeadTitle.toLowerCase() !== "department head"
    ? `${configuredHeadTitle} sent`
    : "Department sent";
  const drafts = useQuery(api.mail.listDrafts);
  const emailAddressRequest = useQuery(api.profiles.getMyEmailAddressRequest);
  const upsertDraft = useMutation(api.mail.upsertDraft);
  const deleteDraft = useMutation(api.mail.deleteDraft);
  const requestEmailAddress = useMutation(api.profiles.requestEmailAddress);
  const setMailboxState = useMutation(api.mail.setMailboxState);
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const mailboxEntries = usePaginatedQuery(
    api.mail.listMailboxEntries,
    folder === "drafts" ? "skip" : { folder },
    { initialNumItems: 25 },
  );
  const relatedMailboxEntries = usePaginatedQuery(
    api.mail.listMailboxEntries,
    folder === "inbox"
      ? { folder: "sent" }
      : folder === "sent"
        ? { folder: "inbox" }
        : "skip",
    { initialNumItems: 25 },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [requestLocalPart, setRequestLocalPart] = useState("");
  const [requestingAddress, setRequestingAddress] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const draftRevisionRef = useRef(0);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftSavesRef = useRef(new Map<string, Set<Promise<void>>>());
  const profileSyncAttemptedFor = useRef<string | null>(null);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id) return;
    if (user.emailVerified === false) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
      return;
    }
    if (profileSyncAttemptedFor.current === user.id) return;
    profileSyncAttemptedFor.current = user.id;
    void ensureCurrentProfile().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not prepare your mailbox.";
      if (/verify your real email/i.test(message)) {
        router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
      } else if (/invitation|required/i.test(message)) {
        router.replace("/invitation-required");
      } else {
        profileSyncAttemptedFor.current = null;
        toast.error(message);
      }
    });
  }, [ensureCurrentProfile, router, session?.user]);

  const convexEmails = useMemo<Email[]>(() => {
    return (mailboxEntries.results ?? []).map((entry) => ({
      id: entry.messageId,
      from: entry.fromEmail,
      fromName: entry.fromName,
      to: entry.to,
      cc: entry.cc,
      bcc: [],
      subject: entry.subject,
      body: entry.bodyPreview,
      folder: entry.folder,
      starred: entry.starred,
      read: entry.read,
      createdAt: entry.createdAt,
    }));
  }, [mailboxEntries.results]);

  const relatedEmails = useMemo<Email[]>(() => {
    return (relatedMailboxEntries.results ?? []).map((entry) => ({
      id: entry.messageId,
      from: entry.fromEmail,
      fromName: entry.fromName,
      to: entry.to,
      cc: entry.cc,
      bcc: [],
      subject: entry.subject,
      body: entry.bodyPreview,
      folder: entry.folder,
      starred: entry.starred,
      read: entry.read,
      createdAt: entry.createdAt,
    }));
  }, [relatedMailboxEntries.results]);

  const draftEmails = useMemo<Email[]>(() => {
    return (drafts ?? []).map((draft) => ({
      id: draft.draftKey,
      from: draft.fromEmail,
      fromName: draft.fromEmail,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
      folder: "drafts",
      starred: false,
      read: true,
      createdAt: draft.updatedAt,
    }));
  }, [drafts]);

  const allEmails = useMemo(
    () => {
      const emailsById = new Map<string, Email>();
      for (const email of relatedEmails) emailsById.set(email.id, email);
      for (const email of convexEmails) emailsById.set(email.id, email);
      return [...emailsById.values(), ...draftEmails];
    },
    [convexEmails, draftEmails, relatedEmails],
  );

  const filtered = useMemo(() => {
    let list = allEmails.filter((e) => {
      return e.folder === folder;
    });
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.subject, e.body, e.from, ...e.to, ...e.cc, ...e.bcc].some((field) =>
          field.toLowerCase().includes(q),
        ),
      );
    }
    return list;
  }, [allEmails, folder, search]);

  const counts = useMemo(() => {
    const inboxUnread = allEmails.filter(
      (e) => e.folder === "inbox" && !e.read,
    ).length;
    return {
      inbox: inboxUnread,
      sent: allEmails.filter((e) => e.folder === "sent").length,
      drafts: allEmails.filter((e) => e.folder === "drafts").length,
      trash: allEmails.filter((e) => e.folder === "trash").length,
      department_sent: allEmails.filter((e) => e.folder === "department_sent").length,
    };
  }, [allEmails]);

  useEffect(() => {
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if ((counts.inbox > 0 || mailboxEntries.status === "CanLoadMore") && badgeNavigator.setAppBadge) {
      void badgeNavigator.setAppBadge().catch(() => undefined);
    } else if (counts.inbox === 0 && mailboxEntries.status === "Exhausted" && badgeNavigator.clearAppBadge) {
      void badgeNavigator.clearAppBadge().catch(() => undefined);
    }
  }, [counts.inbox, mailboxEntries.status]);

  const selected = useMemo(
    () => allEmails.find((e) => e.id === selectedId) ?? null,
    [allEmails, selectedId],
  );
  const selectedThreadMessages = useMemo(() => {
    if (!selected) return [];
    return groupEmailsIntoThreads(allEmails)
      .find((thread) => thread.messages.some((message) => message.id === selected.id))
      ?.messages ?? [selected];
  }, [allEmails, selected]);
  const selectedMessage = useQuery(
    api.mail.getMessage,
    selected && selected.folder !== "drafts"
      ? { messageId: selected.id as Id<"messages"> }
      : "skip",
  );
  const selectedForView = selectedMessage
    ? {
        id: selectedMessage._id,
        from: selectedMessage.fromEmail,
        fromName: selectedMessage.fromName,
        to: selectedMessage.to,
        cc: selectedMessage.cc,
        bcc: selectedMessage.bcc,
        subject: selectedMessage.subject,
        body: selectedMessage.body,
        folder: selected?.folder ?? "inbox",
        starred: selected?.starred ?? false,
        read: selected?.read ?? true,
        createdAt: selectedMessage.createdAt,
      } satisfies Email
    : selected;

  const openCompose = useCallback((draft?: Email) => {
    draftRevisionRef.current += 1;
    setDraftSaveStatus(draft ? "saved" : "idle");
    if (draft) {
      setCompose({
        open: true,
        draftId: draft.id,
        fromName: draft.from.split("@")[0] ?? "me",
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
      });
    } else {
      setCompose({ ...EMPTY_COMPOSE, open: true, draftId: uid() });
    }
    setSendError(null);
  }, []);

  const updateCompose = useCallback((patch: Partial<ComposeState>) => {
    draftRevisionRef.current += 1;
    setDraftSaveStatus("unsaved");
    setCompose((prev) => ({ ...prev, ...patch }));
  }, []);

  const closeCompose = useCallback(() => {
    draftRevisionRef.current += 1;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = null;
    setDraftSaveStatus("idle");
    setCompose(EMPTY_COMPOSE);
    setSendError(null);
  }, []);

  const discardCompose = useCallback(() => {
    const draftKey = compose.draftId;
    closeCompose();
    if (!draftKey) return;
    void (async () => {
      const pending = pendingDraftSavesRef.current.get(draftKey);
      if (pending?.size) await Promise.all([...pending]);
      await deleteDraft({ draftKey });
    })().catch(() => toast.error("Could not discard the draft"));
  }, [closeCompose, compose.draftId, deleteDraft]);

  useEffect(() => {
    if (!compose.open || sending) return;
    const hasContent =
      compose.to.length > 0 ||
      compose.cc.length > 0 ||
      compose.bcc.length > 0 ||
      compose.subject.trim() !== "" ||
      compose.body.trim() !== "";
    if (!hasContent) return;
    const revision = draftRevisionRef.current;
    const draftKey = compose.draftId as string;
    const timer = setTimeout(() => {
      setDraftSaveStatus("saving");
      const save = upsertDraft({
        draftKey: compose.draftId as string,
        fromEmail: profileData?.profile?.assignedEmail ?? buildFromAddress(
          compose.fromName,
          profileData?.companySettings?.domain ?? "",
        ),
        to: compose.to,
        cc: compose.cc,
        bcc: compose.bcc,
        subject: compose.subject,
        body: compose.body,
      }).then(() => {
        if (draftRevisionRef.current === revision) setDraftSaveStatus("saved");
      }).catch(() => {
        if (draftRevisionRef.current === revision) setDraftSaveStatus("error");
      });
      const pending = pendingDraftSavesRef.current.get(draftKey) ?? new Set<Promise<void>>();
      pending.add(save);
      pendingDraftSavesRef.current.set(draftKey, pending);
      void save.finally(() => {
        pending.delete(save);
        if (!pending.size) pendingDraftSavesRef.current.delete(draftKey);
      });
      draftSaveTimerRef.current = null;
    }, 1500);
    draftSaveTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [compose, profileData?.profile?.assignedEmail, sending, upsertDraft]);

  const handleSend = useCallback(async () => {
    const allRecipients = [...compose.to, ...compose.cc, ...compose.bcc];
    if (!profileData?.profile?.assignedEmail) {
      setSendError("Admin or HR must assign you a company email before you can send.");
      return;
    }
    if (compose.to.length === 0) {
      setSendError("Add at least one recipient in the To field.");
      return;
    }
    if (allRecipients.some((r) => !isValidEmail(r))) {
      setSendError("One or more recipient addresses are not valid.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: compose.to,
          cc: compose.cc,
          bcc: compose.bcc,
          subject: compose.subject,
          body: compose.body,
          idempotencyKey: compose.draftId ?? uid(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error ?? "Failed to send the message.");
        return;
      }
      if (compose.draftId) {
        const pending = pendingDraftSavesRef.current.get(compose.draftId);
        if (pending?.size) await Promise.all([...pending]);
        await deleteDraft({ draftKey: compose.draftId });
      }
      setFolder("sent");
      setSelectedId(null);
      closeCompose();
      toast.success("Message sent");
    } catch {
      setSendError("Network error while sending. Try again.");
    } finally {
      setSending(false);
    }
  }, [compose, closeCompose, deleteDraft, profileData?.profile?.assignedEmail]);

  const handleOpen = useCallback(
    (email: Email) => {
      if (email.folder === "drafts") {
        openCompose(email);
        return;
      }
      const thread = groupEmailsIntoThreads(allEmails)
        .find((candidate) => candidate.messages.some((message) => message.id === email.id));
      for (const message of thread?.messages ?? [email]) {
        if (message.folder !== "sent" && message.folder !== "department_sent" && !message.read) {
          void setMailboxState({
            messageId: message.id as Id<"messages">,
            field: "read",
            value: true,
          });
        }
      }
      setSelectedId(email.id);
      setSelectedIds(new Set());
    },
    [allEmails, openCompose, setMailboxState],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const email = allEmails.find((item) => item.id === id);
      if (!email) return;
      if (email.folder === "drafts") {
        void deleteDraft({ draftKey: id });
        setSelectedId(null);
        setSelectedIds(new Set());
        toast.success("Draft deleted");
        return;
      }
      const restoring = email.folder === "trash";
      const thread = groupEmailsIntoThreads(allEmails)
        .find((candidate) => candidate.messages.some((message) => message.id === id));
      for (const message of thread?.messages ?? [email]) {
        void setMailboxState({
          messageId: message.id as Id<"messages">,
          field: "trashed",
          value: !restoring,
        });
      }
      setSelectedId(null);
      setSelectedIds(new Set());
      toast.success(restoring ? "Thread restored" : "Thread moved to trash");
    },
    [allEmails, deleteDraft, setMailboxState],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedEmails = [...selectedIds]
      .map((id) => allEmails.find((email) => email.id === id))
      .filter((email): email is Email => Boolean(email));
    const restoring = folder === "trash";
    for (const email of selectedEmails) {
      if (email.folder === "drafts") void deleteDraft({ draftKey: email.id });
      else void setMailboxState({
        messageId: email.id as Id<"messages">,
        field: "trashed",
        value: !restoring,
      });
    }
    setSelectedIds(new Set());
    toast.success(restoring ? "Messages restored" : "Selected items moved to trash");
  }, [allEmails, deleteDraft, folder, selectedIds, setMailboxState]);

  const toggleStar = useCallback((id: string) => {
    const email = allEmails.find((item) => item.id === id);
    if (!email || email.folder === "drafts") return;
    void setMailboxState({
      messageId: id as Id<"messages">,
      field: "starred",
      value: !email.starred,
    });
  }, [allEmails, setMailboxState]);

  const navigate = useCallback((next: FolderKey) => {
    setFolder(next);
    setSelectedId(null);
    setSelectedIds(new Set());
    setNavOpen(false);
  }, []);

  const markUnread = useCallback((id: string) => {
    void setMailboxState({
      messageId: id as Id<"messages">,
      field: "read",
      value: false,
    });
    setSelectedId(null);
  }, [setMailboxState]);

  const handleRequestEmailAddress = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestingAddress(true);
    try {
      await requestEmailAddress({ localPart: requestLocalPart });
      setRequestLocalPart("");
      toast.success("Address request sent to your administrators");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request an address");
    } finally {
      setRequestingAddress(false);
    }
  }, [requestEmailAddress, requestLocalPart]);

  const handleSignOut = useCallback(() => {
    const badgeNavigator = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    if (badgeNavigator.clearAppBadge) void badgeNavigator.clearAppBadge().catch(() => undefined);
    router.push("/logout");
  }, [router]);

  const searchMatches = search.trim() !== "";
  const userEmail = session?.user?.email ?? null;
  const userName = profileData?.profile?.name ?? session?.user?.name ?? null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f5f7f4]">
      <TopBar
        search={search}
        onSearchChange={setSearch}
        onOpenNav={() => setNavOpen(true)}
        onRefresh={() => {
          setSelectedId(null);
          setSelectedIds(new Set());
          toast.success("Mailbox is up to date");
        }}
        onGoInbox={() => navigate("inbox")}
        userEmail={userEmail}
        userName={userName}
        userCompanyEmail={profileData?.profile?.assignedEmail ?? null}
        userDepartment={profileData?.department?.name ?? null}
        userRole={profileData?.profile?.role === "hrLead"
          ? (profileData?.department?.headTitle ?? "Department head")
          : profileData?.profile?.role === "admin"
            ? "Owner"
            : profileData?.profile?.role === "chief"
              ? "Chief"
              : profileData?.profile?.role === "hr"
                ? "HR"
                : profileData?.profile?.role === "user"
                  ? "Employee"
                  : null}
        isStaff={canAccessAdminPage(userEmail, profileData?.profile?.role)}
        onSignOut={handleSignOut}
      />

      {profileData?.profile && !profileData.profile.assignedEmail && (
        <section className="flow-enter border-b border-[#d9ddd6] bg-[#f5f5f0] px-4 py-4 md:px-6" aria-label="Company email address request">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-[#cbd3cc] bg-white text-[#286653]"><EnvelopeSimple size={17} /></span>
              <div className="min-w-0">
              <p className="text-sm font-semibold text-[#24352e]">Get your company address</p>
              {emailAddressRequest?.status === "pending" ? (
                <p className="mt-1 text-sm text-[#68746e]">Request for <span className="font-medium text-[#24352e]">{emailAddressRequest.requestedEmail}</span> is waiting for admin or HR review.</p>
              ) : emailAddressRequest?.status === "rejected" ? (
                <p className="mt-1 text-sm text-[#68746e]">Your previous request was declined. Choose another address or contact your administrator.</p>
              ) : (
                <p className="mt-1 text-sm text-[#68746e]">Ask your administrator for a sender address at <span className="font-medium text-[#24352e]">@{profileData.companySettings?.domain}</span>.</p>
              )}
              </div>
            </div>
            {emailAddressRequest?.status !== "pending" && (
              <form onSubmit={handleRequestEmailAddress} className="flex w-full flex-col gap-2 sm:max-w-lg sm:flex-row">
                <label htmlFor="request-company-address" className="sr-only">Requested address name</label>
                <div className="flex min-w-0 flex-1 overflow-hidden border border-[#cbd3cc] bg-white focus-within:ring-2 focus-within:ring-[#347563]/20">
                  <Input
                    id="request-company-address"
                    value={requestLocalPart}
                    onChange={(event) => setRequestLocalPart(event.target.value)}
                    placeholder="first.last"
                    className="min-w-0 border-0 shadow-none focus-visible:ring-0"
                    required
                  />
                  <span className="flex max-w-[45%] items-center break-all border-l border-[#cbd3cc] bg-[#f7f8f4] px-2 text-[11px] text-[#68746e] sm:max-w-none sm:text-xs">@{profileData.companySettings?.domain}</span>
                </div>
                <Button type="submit" disabled={requestingAddress} className="min-h-11 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544] active:scale-[0.98] sm:w-auto">
                  {requestingAddress ? "Sending…" : "Request"}
                </Button>
              </form>
            )}
          </div>
        </section>
      )}

      <div className="flex min-h-0 flex-1">
        <div className={selected ? "hidden" : "hidden md:flex"}>
          <Sidebar
            current={folder}
            counts={counts}
            onNavigate={navigate}
            onCompose={() => openCompose()}
            onClose={() => setNavOpen(false)}
            mailDomain={profileData?.companySettings?.domain ?? ""}
            canViewDepartmentSent={profileData?.profile?.role === "hrLead" && Boolean(profileData.profile.departmentId)}
            departmentSentLabel={departmentSentLabel}
          />
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-30 flex md:hidden">
            <Sidebar
              current={folder}
              counts={counts}
              onNavigate={navigate}
              onCompose={() => {
                setNavOpen(false);
                openCompose();
              }}
              onClose={() => setNavOpen(false)}
              mailDomain={profileData?.companySettings?.domain ?? ""}
              canViewDepartmentSent={profileData?.profile?.role === "hrLead" && Boolean(profileData.profile.departmentId)}
              departmentSentLabel={departmentSentLabel}
              mobileDrawer
            />
            <button aria-label="Close navigation" className="min-w-0 flex-1 bg-black/40" onClick={() => setNavOpen(false)} />
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1">
          <div className={`min-h-0 min-w-0 ${selected ? "hidden" : "flex w-full flex-col"}`}>
            <EmailList
              emails={filtered}
              threadContextEmails={allEmails}
              folder={folder}
              selectedId={selectedId}
              selectedIds={selectedIds}
              hasMore={folder !== "drafts" && mailboxEntries.status === "CanLoadMore"}
              searchMatches={searchMatches}
              onOpen={handleOpen}
              onToggleStar={toggleStar}
              onToggleSelectMany={(ids) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  const remove = ids.every((id) => next.has(id));
                  for (const id of ids) {
                    if (remove) next.delete(id);
                    else next.add(id);
                  }
                  return next;
                })
              }
              onDeleteSelected={handleDeleteSelected}
              onClearSelection={() => setSelectedIds(new Set())}
              onRefresh={() => {
                setSelectedIds(new Set());
                toast.success("Mailbox is up to date");
              }}
              onLoadMore={() => mailboxEntries.loadMore(25)}
            />
          </div>

          {selected ? (
            <div className="flex min-h-0 min-w-0 flex-1">
              <EmailView
                email={selectedForView ?? selected}
                threadMessages={selectedThreadMessages}
                onBack={() => setSelectedId(null)}
                onToggleStar={toggleStar}
                onDelete={handleDelete}
                onEditDraft={(draft) => openCompose(draft)}
                onMarkUnread={markUnread}
                onOpenThreadMessage={handleOpen}
                canLoadEarlierMessages={
                  mailboxEntries.status === "CanLoadMore" ||
                  relatedMailboxEntries.status === "CanLoadMore"
                }
                onLoadEarlierMessages={() => {
                  if (mailboxEntries.status === "CanLoadMore") mailboxEntries.loadMore(25);
                  if (relatedMailboxEntries.status === "CanLoadMore") relatedMailboxEntries.loadMore(25);
                }}
              />
            </div>
          ) : null}
        </main>
      </div>

      {compose.open && (
        <ComposeModal
          compose={compose}
          draftSaveStatus={draftSaveStatus}
          sending={sending}
          error={sendError}
          fromEmail={profileData?.profile?.assignedEmail}
          fromName={userName}
          onChange={updateCompose}
          onSend={handleSend}
          onDiscard={discardCompose}
        />
      )}
    </div>
  );
}
