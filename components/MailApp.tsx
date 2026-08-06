"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import EmailList from "@/components/EmailList";
import EmailView from "@/components/EmailView";
import ComposeModal from "@/components/ComposeModal";
import {
  buildFromAddress,
  isValidEmail,
  loadEmails,
  saveEmails,
  uid,
} from "@/lib/mail";
import { authClient } from "@/lib/auth-client";
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
  const [emails, setEmails] = useState<Email[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const mailboxFolder = folder === "inbox" || folder === "sent" ? folder : "inbox";
  const mailboxEntries = usePaginatedQuery(
    api.mail.listMailboxEntries,
    folder === "inbox" || folder === "sent" ? { folder: mailboxFolder } : "skip",
    { initialNumItems: 25 },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    // Reading persisted mail from localStorage is an external-system sync.
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmails(loadEmails().filter((email) => email.folder === "drafts"));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (loaded) saveEmails(emails.filter((email) => email.folder === "drafts"));
  }, [emails, loaded]);

  useEffect(() => {
    if (!session?.user) return;
    void ensureCurrentProfile();
  }, [ensureCurrentProfile, session?.user]);

  const patchEmail = useCallback((id: string, patch: Partial<Email>) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }, []);

  const convexEmails = useMemo<Email[]>(() => {
    return (mailboxEntries.results ?? []).map((entry) => ({
      id: entry.messageId,
      from: entry.fromEmail,
      to: entry.to,
      cc: entry.cc,
      bcc: [],
      subject: entry.subject,
      body: entry.bodyPreview,
      folder: entry.folder,
      starred: false,
      read: true,
      createdAt: entry.createdAt,
    }));
  }, [mailboxEntries.results]);

  const allEmails = useMemo(
    () => [...convexEmails, ...emails],
    [convexEmails, emails],
  );

  const filtered = useMemo(() => {
    let list = allEmails.filter((e) => {
      if (folder === "starred") return e.starred && e.folder !== "trash";
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
        to: selectedMessage.to,
        cc: selectedMessage.cc,
        bcc: selectedMessage.bcc,
        subject: selectedMessage.subject,
        body: selectedMessage.body,
        folder: selected?.folder ?? "inbox",
        starred: selected?.starred ?? false,
        read: true,
        createdAt: selectedMessage.createdAt,
      } satisfies Email
    : selected;

  const openCompose = useCallback((draft?: Email) => {
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
    setCompose((prev) => ({ ...prev, ...patch }));
  }, []);

  const closeCompose = useCallback(() => {
    setCompose(EMPTY_COMPOSE);
    setSendError(null);
  }, []);

  const discardCompose = useCallback(() => {
    setEmails((prev) =>
      prev.filter((e) => e.id !== compose.draftId || e.folder !== "drafts"),
    );
    closeCompose();
  }, [compose.draftId, closeCompose]);

  useEffect(() => {
    if (!compose.open || sending) return;
    const hasContent =
      compose.to.length > 0 ||
      compose.subject.trim() !== "" ||
      compose.body.trim() !== "";
    if (!hasContent) return;
    const timer = setTimeout(() => {
      setEmails((prev) => {
        const draft: Email = {
          id: compose.draftId as string,
          from: profileData?.profile?.assignedEmail ?? buildFromAddress(compose.fromName),
          to: compose.to,
          cc: compose.cc,
          bcc: compose.bcc,
          subject: compose.subject,
          body: compose.body,
          folder: "drafts",
          starred: false,
          read: true,
          createdAt: Date.now(),
        };
        const exists = prev.some((e) => e.id === draft.id);
        return exists
          ? prev.map((e) => (e.id === draft.id ? draft : e))
          : [draft, ...prev];
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [compose, profileData?.profile?.assignedEmail, sending]);

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
      setEmails((prev) => prev.filter((e) => e.id !== compose.draftId));
      setFolder("sent");
      setSelectedId(null);
      closeCompose();
      toast.success("Message sent");
    } catch {
      setSendError("Network error while sending. Try again.");
    } finally {
      setSending(false);
    }
  }, [compose, closeCompose, profileData?.profile?.assignedEmail]);

  const handleOpen = useCallback(
    (email: Email) => {
      if (email.folder === "drafts") {
        openCompose(email);
        return;
      }
      setSelectedId(email.id);
      setSelectedIds(new Set());
      if (!email.read) {
        patchEmail(email.id, { read: true });
      }
    },
    [openCompose, patchEmail],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setEmails((prev) =>
        prev.some((e) => e.id === id && e.folder === "trash")
          ? prev.filter((e) => e.id !== id)
          : prev.map((e) =>
              e.id === id ? { ...e, folder: "trash" as FolderKey } : e,
            ),
      );
      setSelectedId(null);
      setSelectedIds(new Set());
      toast.success("Moved to trash");
    },
    [],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setEmails((prev) =>
      prev.map((e) =>
        selectedIds.has(e.id) && e.folder !== "trash"
          ? { ...e, folder: "trash" as FolderKey }
          : e,
      ),
    );
    setSelectedIds(new Set());
    toast.success(
      `${selectedIds.size} message${selectedIds.size > 1 ? "s" : ""} moved to trash`,
    );
  }, [selectedIds]);

  const toggleStar = useCallback(
    (id: string) => {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
      );
    },
    [],
  );

  const navigate = useCallback((next: FolderKey) => {
    setFolder(next);
    setSelectedId(null);
    setSelectedIds(new Set());
    setNavOpen(false);
  }, []);

  const markUnread = useCallback(
    (id: string) => patchEmail(id, { read: false }),
    [patchEmail],
  );

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    router.push("/login");
  }, [router]);

  const searchMatches = search.trim() !== "";
  const userEmail = session?.user?.email ?? null;
  const userName = profileData?.profile?.name ?? session?.user?.name ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f8fc]">
      <TopBar
        search={search}
        onSearchChange={setSearch}
        onOpenNav={() => setNavOpen(true)}
        onRefresh={() => {
          setEmails(loadEmails());
          setSelectedId(null);
          toast.success("Refreshed");
        }}
        onGoInbox={() => navigate("inbox")}
        userEmail={userEmail}
        userName={userName}
        isStaff={
          profileData?.profile?.role === "admin" || profileData?.profile?.role === "hr"
        }
        onSignOut={handleSignOut}
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar
            current={folder}
            counts={counts}
            onNavigate={navigate}
            onCompose={() => openCompose()}
            onClose={() => setNavOpen(false)}
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
              <Mail className="h-14 w-14" />
              <p className="text-sm">
                {searchMatches
                  ? "No messages match your search"
                  : "Select a message to read it"}
              </p>
              <button
                onClick={() => openCompose()}
                className="mt-2 rounded-md bg-[#0b57d0] px-4 py-2 text-sm text-white hover:bg-[#0b4ec0]"
              >
                Compose
              </button>
            </div>
          )}
          {(folder === "inbox" || folder === "sent") && mailboxEntries.status === "CanLoadMore" && !selected && (
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
