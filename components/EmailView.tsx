"use client";

import { Star, Trash2, Pencil, ArrowLeft, Archive, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatAddresses, formatMailboxAddress, formatTimestamp, snippet } from "@/lib/mail";
import type { Email } from "@/lib/types";

interface EmailViewProps {
  email: Email;
  threadMessages: Email[];
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onEditDraft: (email: Email) => void;
  onMarkUnread: (id: string) => void;
  onOpenThreadMessage: (email: Email) => void;
  canLoadEarlierMessages: boolean;
  onLoadEarlierMessages: () => void;
}

export default function EmailView({
  email,
  threadMessages,
  onBack,
  onToggleStar,
  onDelete,
  onEditDraft,
  onMarkUnread,
  onOpenThreadMessage,
  canLoadEarlierMessages,
  onLoadEarlierMessages,
}: EmailViewProps) {
  const isDraft = email.folder === "drafts";
  const messages = threadMessages.length > 0 ? threadMessages : [email];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex min-h-14 flex-wrap items-center gap-1 border-b border-gray-200 px-2 py-1.5 sm:px-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex min-h-11 min-w-11 items-center gap-2 rounded-full px-3 text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" /><span className="text-sm">Back to list</span>
        </button>

        <button
          onClick={() => onToggleStar(email.id)}
          aria-label={email.starred ? "Unstar" : "Star"}
          className="min-h-11 min-w-11 rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <Star className={`h-5 w-5 ${email.starred ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>

        {isDraft ? (
          <button
            onClick={() => onEditDraft(email)}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[#0b57d0] hover:bg-[#e8f0fe]"
          >
            <Pencil className="h-4 w-4" />
            Edit draft
          </button>
        ) : (
          <>
            <button
              onClick={() => onMarkUnread(email.id)}
              aria-label="Mark unread"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm text-gray-700 hover:bg-gray-100 sm:px-3"
            >
              <Mail className="h-5 w-5" /><span className="hidden sm:inline">Mark unread</span>
            </button>
            <button
              onClick={() => onDelete(email.id)}
              aria-label="Archive"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm text-gray-700 hover:bg-gray-100 sm:px-3"
            >
              <Archive className="h-5 w-5" /><span className="hidden sm:inline">Archive</span>
            </button>
          </>
        )}

        <button
          onClick={() => onDelete(email.id)}
          aria-label="Delete"
          className="ml-auto min-h-11 min-w-11 rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <h1 className="break-words text-xl font-normal text-gray-900 md:text-2xl">
          {email.subject || "(no subject)"}
        </h1>
        {messages.length > 1 && (
          <p className="mt-2 text-sm text-gray-500">
            {messages.length} messages in this conversation
          </p>
        )}

        <div className="mt-5 divide-y divide-gray-200 rounded-xl border border-gray-200">
          {messages.map((message) => message.id === email.id ? (
            <article key={message.id} className="p-4 md:p-5">
              <div className="flex min-w-0 flex-wrap items-start gap-3">
                <Avatar name={email.fromName || email.from} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-gray-900 [overflow-wrap:anywhere]">
                    {formatMailboxAddress(email.from, email.fromName)}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-500 [overflow-wrap:anywhere]">
                    To: {formatAddresses(email.to) || "-"}
                    {email.cc.length > 0 && <> · Cc: {formatAddresses(email.cc)}</>}
                    {email.bcc.length > 0 && <> · Bcc: {formatAddresses(email.bcc)}</>}
                  </p>
                </div>
                <time className="ml-auto shrink-0 text-xs text-gray-500">
                  {new Date(email.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 [overflow-wrap:anywhere]">
                {email.body}
              </div>
            </article>
          ) : (
            <button
              key={message.id}
              type="button"
              onClick={() => onOpenThreadMessage(message)}
              className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-gray-50 md:px-5"
            >
              <Avatar name={message.fromName || message.from} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-4">
                  <span className="truncate text-sm font-medium text-gray-900">
                    {formatMailboxAddress(message.from, message.fromName)}
                  </span>
                  <time className="shrink-0 text-xs text-gray-500">
                    {formatTimestamp(message.createdAt)}
                  </time>
                </span>
                <span className="mt-1 block truncate text-sm text-gray-500">
                  {snippet(message.body, 180)}
                </span>
              </span>
            </button>
          ))}
        </div>
        {canLoadEarlierMessages && (
          <button
            type="button"
            onClick={onLoadEarlierMessages}
            className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Load older messages
          </button>
        )}
      </div>
    </section>
  );
}
