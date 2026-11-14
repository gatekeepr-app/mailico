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
                    className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition hover:shadow-sm md:px-4 ${
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
                      className="shrink-0 accent-[#0b57d0]"
                      aria-label={`Select ${contextMessages.length} message${contextMessages.length === 1 ? "" : "s"}`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(email.id);
                      }}
                      aria-label={email.starred ? "Unstar" : "Star"}
                      className="shrink-0"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          email.starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 hover:text-gray-500"
                        }`}
                      />
                    </button>

                    <div className="flex min-w-0 flex-1 items-baseline gap-3">
                      <span
                        className={`w-40 shrink-0 truncate text-sm md:w-44 ${
                          unread ? "font-bold text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {senderLabel}
                      </span>
                      {contextMessages.length > 1 && (
                        <span className="shrink-0 rounded-full bg-[#e8eaed] px-2 py-0.5 text-xs font-medium text-[#5f6368]">
                          {contextMessages.length}
                        </span>
                      )}
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          className={`truncate ${
                            !unread
                              ? "text-sm text-gray-600"
                              : "text-sm font-semibold text-gray-900"
                          }`}
                        >
                          {email.subject || "(no subject)"}
                          {email.subject && (
                            <span className="ml-2 hidden font-normal text-gray-400 md:inline">
                              - {snippet(email.body, 60)}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 pl-3 text-xs text-gray-500">
                        {formatTimestamp(email.createdAt)}
                      </span>
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
