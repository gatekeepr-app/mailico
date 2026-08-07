"use client";

import { Star, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatAddresses } from "@/lib/mail";
import type { Email } from "@/lib/types";

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onEditDraft: (email: Email) => void;
  onMarkUnread: (id: string) => void;
}

export default function EmailView({
  email,
  onBack,
  onToggleStar,
  onDelete,
  onEditDraft,
  onMarkUnread,
}: EmailViewProps) {
  const isDraft = email.folder === "drafts";

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-2">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => onToggleStar(email.id)}
          aria-label={email.starred ? "Unstar" : "Star"}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <Star
            className={`h-5 w-5 ${
              email.starred ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
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
              className="hidden rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 md:block"
            >
              Mark unread
            </button>
            <button
              onClick={() => onDelete(email.id)}
              className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Archive
            </button>
          </>
        )}

        <button
          onClick={() => onDelete(email.id)}
          aria-label="Delete"
          className="ml-auto rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <h1 className="text-xl font-normal text-gray-900 md:text-2xl">
          {email.subject || "(no subject)"}
        </h1>

        <div className="mt-5 flex items-start gap-3">
          <Avatar name={email.from} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-900">{email.from}</p>
            <p className="text-xs text-gray-500">
              To: {formatAddresses(email.to) || "—"}
              {email.cc.length > 0 && <> · Cc: {formatAddresses(email.cc)}</>}
              {email.bcc.length > 0 && <> · Bcc: {formatAddresses(email.bcc)}</>}
            </p>
          </div>
          <span className="shrink-0 text-xs text-gray-500">
            {new Date(email.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
          {email.body}
        </div>
      </div>
    </section>
  );
}
