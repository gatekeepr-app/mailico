"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  FileText,
  Inbox,
  Info,
  RefreshCw,
  Tag,
  Trash2,
  UsersRound,
  Star,
} from "lucide-react";
import { formatMailboxName, formatTimestamp, groupEmailsIntoThreads, snippet, folderLabel } from "@/lib/mail";
import type { Email, FolderKey } from "@/lib/types";

interface EmailListProps {
  emails: Email[];
  threadContextEmails: Email[];
  folder: FolderKey;
  selectedId: string | null;
  selectedIds: Set<string>;
  hasMore: boolean;
  searchMatches: boolean;
  onOpen: (email: Email) => void;
  onToggleStar: (id: string) => void;
  onToggleSelectMany: (ids: string[]) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}

type Category = "primary" | "promotions" | "social" | "updates";

const CATEGORIES: { id: Category; label: string; icon: typeof Inbox }[] = [
  { id: "primary", label: "Primary", icon: Inbox },
  { id: "promotions", label: "Promotions", icon: Tag },
  { id: "social", label: "Social", icon: UsersRound },
  { id: "updates", label: "Updates", icon: Info },
];

function categoryFor(email: Email): Category {
  const text = `${email.from} ${email.fromName ?? ""} ${email.subject} ${email.body}`.toLowerCase();
  if (/unsubscribe|newsletter|promotion|discount|coupon|special offer|sale|deal of the day/.test(text)) return "promotions";
  if (/linkedin|facebook|instagram|twitter|reddit|discord|social|new follower|mentioned you|invited you to connect/.test(text)) return "social";
  if (/security alert|verification|verify your|receipt|invoice|delivery|shipping|password reset|account update|statement|payment/.test(text)) return "updates";
  return "primary";
}

function displayName(email: Email): string {
  if (email.folder === "sent" || email.folder === "drafts") {
    return email.to.join(", ") || "No recipients";
  }
  return formatMailboxName(email.from, email.fromName);
}

export default function EmailList({
  emails,
  threadContextEmails,
  folder,
  selectedId,
  selectedIds,
  hasMore,
  searchMatches,
  onOpen,
  onToggleStar,
  onToggleSelectMany,
  onDeleteSelected,
  onClearSelection,
  onRefresh,
  onLoadMore,
}: EmailListProps) {
  const [category, setCategory] = useState<Category>("primary");
  const [isMobile, setIsMobile] = useState(true);
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const allThreads = useMemo(() => groupEmailsIntoThreads(emails), [emails]);
  const activeCategory = isMobile ? "primary" : category;
  const threads = useMemo(
    () => folder === "inbox" && activeCategory !== "primary"
      ? allThreads.filter((thread) => categoryFor(thread.latest) === activeCategory)
      : folder === "inbox"
        ? allThreads.filter((thread) => categoryFor(thread.latest) === "primary")
        : allThreads,
    [allThreads, activeCategory, folder],
  );
  const threadContextByKey = new Map(
    groupEmailsIntoThreads(threadContextEmails).map((thread) => [thread.key, thread] as const),
  );
  const visibleIds = threads.flatMap((thread) =>
    (threadContextByKey.get(thread.key)?.messages ?? thread.messages).map((message) => message.id),
  );
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex min-h-14 shrink-0 items-center gap-1 border-b border-[#e3e9e4] px-3 sm:px-5">
        <label className="hidden min-h-11 min-w-11 items-center justify-center md:flex" aria-label="Select all conversations">
          <input
            aria-label="Select all conversations in the current view"
            type="checkbox"
            checked={allVisibleSelected}
            disabled={visibleIds.length === 0}
            onChange={() => onToggleSelectMany(visibleIds)}
            className="h-5 w-5 accent-[#286653]"
          />
        </label>
        <div className="relative hidden md:block">
          <button
            type="button"
            aria-label="Selection options"
            aria-expanded={selectionMenuOpen}
            onClick={() => setSelectionMenuOpen((open) => !open)}
            className="flex min-h-10 min-w-8 items-center justify-center rounded-full text-[#718078] hover:bg-[#f0f4f1]"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {selectionMenuOpen && (
            <div role="menu" aria-label="Select conversations" className="absolute left-0 top-11 z-20 w-40 rounded-md border border-[#e3e9e4] bg-white p-1 shadow-lg">
              <SelectionMenuItem label="All" onClick={() => { onToggleSelectMany(visibleIds); setSelectionMenuOpen(false); }} />
              <SelectionMenuItem label="None" onClick={() => { onClearSelection(); setSelectionMenuOpen(false); }} />
              <div className="my-1 border-t border-[#edf1ed]" />
              {([
                ["Read", (email: Email) => email.read],
                ["Unread", (email: Email) => !email.read],
                ["Starred", (email: Email) => email.starred],
                ["Unstarred", (email: Email) => !email.starred],
              ] as const).map(([label, matches]) => {
                const ids = threads
                  .filter((thread) => matches(thread.latest))
                  .flatMap((thread) => (threadContextByKey.get(thread.key) ?? thread).messages.map((message) => message.id));
                return <SelectionMenuItem key={label} label={label} onClick={() => { onToggleSelectMany(ids); setSelectionMenuOpen(false); }} />;
              })}
            </div>
          )}
        </div>
        <button onClick={onRefresh} aria-label="Refresh inbox" className="hidden min-h-10 min-w-10 items-center justify-center rounded-full text-[#52635b] hover:bg-[#f0f4f1] md:flex">
          <RefreshCw className="h-4 w-4" />
        </button>
        {selectedIds.size > 0 && (
          <>
            <button onClick={onDeleteSelected} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm text-[#46564e] hover:bg-[#f0f4f1]">
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
            </button>
            <button onClick={onClearSelection} className="rounded-md px-3 py-2 text-sm text-[#718078] hover:bg-[#f0f4f1]">Clear</button>
          </>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-1 text-xs text-[#718078] sm:gap-3 sm:text-sm">
          <span className="whitespace-nowrap">{emails.length} loaded</span>
          {hasMore && (
            <button onClick={onLoadMore} aria-label="Load more messages" title="Load more messages" className="flex min-h-10 min-w-10 items-center justify-center rounded-full hover:bg-[#f0f4f1]">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {folder === "inbox" && (
        <nav aria-label="Inbox categories" className="hidden shrink-0 grid-cols-4 border-b border-[#e3e9e4] md:grid">
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(id)}
                className={`flex min-h-12 items-center gap-2 border-b-2 px-3 text-left text-sm transition-colors sm:min-h-14 sm:px-5 ${
                  active
                    ? "border-[#286653] font-semibold text-[#286653]"
                    : "border-transparent text-[#68766e] hover:bg-[#f7f9f7] hover:text-[#24352e]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <EmptyState folder={folder} category={activeCategory} searchMatches={searchMatches} />
        ) : (
          <ul className="divide-y divide-[#e8ede9]">
            {threads.map((thread) => {
              const email = thread.latest;
              const contextMessages = threadContextByKey.get(thread.key)?.messages ?? thread.messages;
              const threadIds = contextMessages.map((message) => message.id);
              const active = threadIds.includes(selectedId ?? "");
              const allSelected = threadIds.length > 0 && threadIds.every((id) => selectedIds.has(id));
              const senderNames = [...new Set(thread.messages.map(displayName))];
              const senderLabel = folder === "sent" ? displayName(email) : senderNames.join(", ");
              const unread = thread.messages.some((message) => !message.read);
              return (
                <li key={thread.key}>
                  <div
                    onClick={() => onOpen(email)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open conversation: ${email.subject || "no subject"}`}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onOpen(email);
                      }
                    }}
                    className={`group grid min-h-[3.5rem] min-w-0 cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-1 border-l-2 px-1.5 py-2 transition-colors hover:bg-[#f5f8f5] md:min-h-[3.75rem] md:grid-cols-[1.5rem_1.5rem_minmax(8rem,12rem)_minmax(0,1fr)_5.5rem] md:gap-x-2 md:px-3 ${
                      active
                        ? "border-l-[#286653] bg-[#e8f1eb]"
                        : `border-l-transparent ${unread ? "bg-[#f7faf7]" : "bg-white"}`
                    }`}
                  >
                    <div className="col-start-1 row-span-2 flex items-center justify-start gap-0 md:contents">
                      <input
                        className="hidden h-4 w-4 shrink-0 accent-[#286653] md:block md:col-start-1 md:row-start-1"
                        type="checkbox"
                        checked={allSelected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => onToggleSelectMany(threadIds)}
                        aria-label={`Select ${contextMessages.length} message${contextMessages.length === 1 ? "" : "s"}`}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleStar(email.id);
                        }}
                        aria-label={email.starred ? "Unstar" : "Star"}
                        className="flex min-h-10 min-w-10 items-center justify-center rounded-full hover:bg-[#edf3ef] md:col-start-2 md:row-start-1"
                      >
                        <Star className={`h-5 w-5 ${email.starred ? "fill-amber-400 text-amber-400" : "text-[#c6d0c9] group-hover:text-[#718078]"}`} />
                      </button>
                    </div>
                    <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 md:col-start-3 md:row-start-1">
                      <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-semibold text-[#24352e]" : "text-[#46564e]"}`}>
                        {senderLabel}
                      </span>
                      {contextMessages.length > 1 && <span className="shrink-0 rounded-full bg-[#e9efeb] px-1.5 py-0.5 text-[11px] font-medium text-[#52635b]">{contextMessages.length}</span>}
                      <time className="shrink-0 text-[11px] text-[#718078] md:hidden">{formatTimestamp(email.createdAt)}</time>
                    </div>
                    <div className="col-start-2 row-start-2 min-w-0 truncate md:col-start-4 md:row-start-1">
                      <span className={`${unread ? "text-sm font-semibold text-[#24352e]" : "text-sm text-[#52635b]"}`}>{email.subject || "(no subject)"}</span>
                      {email.subject && <span className="ml-2 text-sm text-[#87948d]">{snippet(email.body, 100)}</span>}
                    </div>
                    <time className="hidden justify-self-end whitespace-nowrap text-xs text-[#718078] md:col-start-5 md:row-start-1 md:block">{formatTimestamp(email.createdAt)}</time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function SelectionMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex min-h-9 w-full items-center rounded px-3 text-left text-sm text-[#46564e] hover:bg-[#f0f4f1]"
    >
      {label}
    </button>
  );
}

function EmptyState({ folder, category, searchMatches }: { folder: FolderKey; category: Category; searchMatches: boolean }) {
  const Icon = folder === "inbox" ? Inbox : folder === "trash" ? Archive : FileText;
  const message = searchMatches
    ? "No messages match your search"
    : folder === "inbox"
      ? `No ${category} conversations`
      : `No ${folderLabel(folder).toLowerCase()} messages here`;
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-5 text-center text-[#87948d]">
      <Icon className="h-10 w-10 text-[#aab7af]" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
