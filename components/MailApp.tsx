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

  useEffect(() => {
    if (!session?.user) return;
    void ensureCurrentProfile();
  }, [ensureCurrentProfile, session?.user]);

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
    () => [...convexEmails, ...draftEmails],
    [convexEmails, draftEmails],
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
    };
  }, [allEmails]);

  const selected = useMemo(
    () => allEmails.find((e) => e.id === selectedId) ?? null,
    [allEmails, selectedId],
  );
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
      if (email.folder !== "sent" && !email.read) {
        void setMailboxState({
          messageId: email.id as Id<"messages">,
          field: "read",
          value: true,
        });
      }
      setSelectedId(email.id);
      setSelectedIds(new Set());
    },
    [openCompose, setMailboxState],
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
      void setMailboxState({
        messageId: id as Id<"messages">,
        field: "trashed",
        value: !restoring,
      });
      setSelectedId(null);
      setSelectedIds(new Set());
      toast.success(restoring ? "Message restored" : "Message moved to trash");
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

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    router.push("/login");
  }, [router]);

  const searchMatches = search.trim() !== "";
  const userEmail = session?.user?.email ?? null;
  const userName = profileData?.profile?.name ?? session?.user?.name ?? null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f5f5f0]">
      <TopBar
        search={search}
        onSearchChange={setSearch}
        onOpenNav={() => setNavOpen(true)}
        onRefresh={() => {
          setSelectedId(null);
          toast.success("Refreshed");
        }}
        onGoInbox={() => navigate("inbox")}
        userEmail={userEmail}
        userName={userName}
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
              <form onSubmit={handleRequestEmailAddress} className="flex w-full gap-2 sm:max-w-lg">
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
                  <span className="flex items-center border-l border-[#cbd3cc] bg-[#f7f8f4] px-2 text-xs text-[#68746e]">@{profileData.companySettings?.domain}</span>
                </div>
                <Button type="submit" disabled={requestingAddress} className="rounded-none bg-[#286653] text-white hover:bg-[#1f5544] active:scale-[0.98]">
                  {requestingAddress ? "Sending…" : "Request"}
                </Button>
              </form>
            )}
          </div>
        </section>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar
            current={folder}
            counts={counts}
            onNavigate={navigate}
            onCompose={() => openCompose()}
            onClose={() => setNavOpen(false)}
            mailDomain={profileData?.companySettings?.domain ?? ""}
          />
        </div>

        {navOpen && (
          <div className="fixed inset-0 z-30 flex md:hidden">
            <div
              className="flex-1 bg-black/40"
              onClick={() => setNavOpen(false)}
            />
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
            />
          </div>
        )}

        <main className="flex min-h-0 flex-1">
          <div
            className={`min-h-0 md:flex md:w-[min(420px,40%)] md:flex-col md:border-r md:border-gray-200 ${
              selected ? "hidden" : "flex w-full flex-col"
            }`}
          >
            <EmailList
              emails={filtered}
              folder={folder}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onOpen={handleOpen}
              onToggleStar={toggleStar}
              onToggleSelect={(id) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onDeleteSelected={handleDeleteSelected}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          </div>

          {selected ? (
            <div className="min-w-0 flex-1 md:flex">
              <EmailView
                email={selectedForView ?? selected}
                onBack={() => setSelectedId(null)}
                onToggleStar={toggleStar}
                onDelete={handleDelete}
                onEditDraft={(draft) => openCompose(draft)}
                onMarkUnread={markUnread}
              />
            </div>
          ) : (
            <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-white text-gray-400 md:flex">
              <EnvelopeSimple size={56} weight="thin" />
              <p className="text-sm">
                {searchMatches
                  ? "No messages match your search"
                  : "Select a message to read it"}
              </p>
              <button
                onClick={() => openCompose()}
                className="mt-2 rounded-none bg-[#286653] px-4 py-2 text-sm text-white hover:bg-[#1f5544] active:scale-[0.98]"
              >
                Compose
              </button>
            </div>
          )}
          {folder !== "drafts" && mailboxEntries.status === "CanLoadMore" && !selected && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => mailboxEntries.loadMore(25)}
                className="rounded-full border bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Load more
              </button>
            </div>
          )}
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
