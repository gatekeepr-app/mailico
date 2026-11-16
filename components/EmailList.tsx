"use client";

import { Star, Trash2, FileText, Archive } from "lucide-react";
import { formatMailboxName, formatTimestamp, groupEmailsIntoThreads, snippet } from "@/lib/mail";
import type { Email, FolderKey } from "@/lib/types";

interface EmailListProps {
  emails: Email[];
  threadContextEmails: Email[];
  folder: FolderKey;
  selectedId: string | null;
  selectedIds: Set<string>;
  onOpen: (email: Email) => void;
  onToggleStar: (id: string) => void;
  onToggleSelectMany: (ids: string[]) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
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
  onOpen,
  onToggleStar,
  onToggleSelectMany,
  onDeleteSelected,
  onClearSelection,
}: EmailListProps) {
  const hasSelection = selectedIds.size > 0;
  const threads = groupEmailsIntoThreads(emails);
  const threadContextByKey = new Map(
    groupEmailsIntoThreads(threadContextEmails).map((thread) => [thread.key, thread] as const),
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {hasSelection && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={onClearSelection}
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <EmptyState folder={folder} />
        ) : (
          <ul className="divide-y divide-gray-100">
            {threads.map((thread) => {
              const email = thread.latest;
              const contextMessages = threadContextByKey.get(thread.key)?.messages ?? thread.messages;
              const threadIds = contextMessages.map((message) => message.id);
              const active = threadIds.includes(selectedId ?? "");
              const selectedCount = threadIds.filter((id) => selectedIds.has(id)).length;
              const allSelected = selectedCount === threadIds.length;
              const senderNames = [...new Set(thread.messages.map(displayName))];
              const senderLabel = folder === "sent"
                ? displayName(email)
                : senderNames.join(", ");
              const unread = thread.messages.some((message) => !message.read);
              return (
                <li key={thread.key}>
                  <div
                    onClick={() => onOpen(email)}
                    className={`grid min-w-0 cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] gap-x-1 border-b border-gray-100 px-2 py-2.5 transition hover:shadow-sm sm:px-4 ${
                      active
                        ? "bg-[#d3e3fd]"
                        : !unread
                          ? "bg-white"
                          : "bg-[#f2f6fc]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleSelectMany(threadIds)}
                      className="col-start-1 row-span-2 mx-auto h-5 w-5 shrink-0 accent-[#0b57d0]"
                      aria-label={`Select ${contextMessages.length} message${contextMessages.length === 1 ? "" : "s"}`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(email.id);
                      }}
                      aria-label={email.starred ? "Unstar" : "Star"}
                      className="col-start-1 row-start-2 mx-auto flex min-h-11 min-w-11 items-center justify-center"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          email.starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 hover:text-gray-500"
                        }`}
                      />
                    </button>

                    <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          unread ? "font-bold text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {senderLabel}
                      </span>
                      {contextMessages.length > 1 && (
                        <span className="shrink-0 rounded-full bg-[#e8eaed] px-1.5 py-0.5 text-[11px] font-medium text-[#5f6368]">
                          {contextMessages.length}
                        </span>
                      )}
                      <time className="shrink-0 text-[11px] text-gray-500 sm:text-xs">
                        {formatTimestamp(email.createdAt)}
                      </time>
                    </div>
                    <div className="col-start-2 row-start-2 min-w-0 truncate">
                      <span className={`${!unread ? "text-sm text-gray-600" : "text-sm font-semibold text-gray-900"}`}>
                        {email.subject || "(no subject)"}
                      </span>
                      {email.subject && <span className="ml-2 text-sm text-gray-400">{snippet(email.body, 60)}</span>}
                    </div>
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

function EmptyState({ folder }: { folder: FolderKey }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
      {folder === "inbox" ? (
        <Archive className="h-10 w-10" />
      ) : (
        <FileText className="h-10 w-10" />
      )}
      <p className="text-sm">No {folder === "inbox" ? "messages" : folder} here</p>
    </div>
  );
}
