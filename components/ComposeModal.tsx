"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Save, Trash2, ChevronDown, Paperclip } from "lucide-react";
import type { ComposeState } from "@/lib/types";

interface ComposeModalProps {
  compose: ComposeState;
  draftSaveStatus: "idle" | "unsaved" | "saving" | "saved" | "error";
  sending: boolean;
  error: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  onChange: (patch: Partial<ComposeState>) => void;
  onSend: () => void;
  onDiscard: () => void;
}

export default function ComposeModal({
  compose,
  draftSaveStatus,
  sending,
  error,
  fromEmail,
  fromName,
  onChange,
  onSend,
  onDiscard,
}: ComposeModalProps) {
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const showSecondary =
    showCc || showBcc || compose.cc.length > 0 || compose.bcc.length > 0;

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const fullFrom = fromEmail ?? "No assigned sender";

  return (
    <div className="fixed inset-0 z-40 flex min-h-0 w-full flex-col bg-white pb-[env(safe-area-inset-bottom)] md:inset-auto md:bottom-4 md:right-4 md:max-h-[min(85dvh,48rem)] md:w-[min(42rem,calc(100vw-2rem))] md:rounded-2xl md:bg-transparent md:pb-0 md:shadow-2xl">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-gray-300">
        <div className="flex shrink-0 items-center justify-between bg-[#f2f6fc] px-4 py-3 md:rounded-t-2xl">
          <h2 className="text-sm font-medium text-gray-800">
            {compose.draftId ? "Edit draft" : "New Message"}
          </h2>
          <button
            onClick={onDiscard}
            disabled={sending}
            aria-label="Discard draft"
            className="min-h-11 min-w-11 rounded-full p-2.5 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-gray-200 px-4">
          <div className="flex items-center py-2">
            <label className="w-10 text-xs text-gray-500">To</label>
            <div className="flex-1">
              <RecipientChipInput
                value={compose.to}
                onChange={(to) => onChange({ to })}
              />
            </div>
            <div className="flex gap-1 pl-2">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-xs font-medium text-gray-600 hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-xs font-medium text-gray-600 hover:underline"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {(showCc || compose.cc.length > 0) && (
            <div className="flex items-center py-2">
              <label className="w-10 text-xs text-gray-500">Cc</label>
              <div className="flex-1">
                <RecipientChipInput
                  value={compose.cc}
                  onChange={(cc) => onChange({ cc })}
                />
              </div>
            </div>
          )}

          {(showBcc || compose.bcc.length > 0) && (
            <div className="flex items-center py-2">
              <label className="w-10 text-xs text-gray-500">Bcc</label>
              <div className="flex-1">
                <RecipientChipInput
                  value={compose.bcc}
                  onChange={(bcc) => onChange({ bcc })}
                />
              </div>
            </div>
          )}

          {showSecondary && (
            <div className="flex items-center justify-center py-1">
              <button
                onClick={() => {
                  setShowCc(false);
                  setShowBcc(false);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <ChevronDown className="h-3.5 w-3.5" /> Hide fields
              </button>
            </div>
          )}

          <div className="flex items-center py-2">
            <label className="w-10 text-xs text-gray-500">From</label>
            <div className="flex flex-1 items-center gap-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-gray-900">
                {fromName ? `${fromName} <${fullFrom}>` : fullFrom}
              </span>
            </div>
          </div>
          <p className="pb-2 text-[11px] text-gray-400">
            Admin or HR assigns sender addresses. Users cannot edit the From
            address.
          </p>

          <div className="flex items-center py-2">
            <input
              type="text"
              value={compose.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="Subject"
              className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-500"
            />
          </div>
        </div>

        <textarea
          ref={bodyRef}
          value={compose.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Write your message"
          className="min-h-32 w-full shrink-0 resize-none px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-400 md:min-h-[220px] md:flex-1"
        />

        <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-3">
          <button
            onClick={onSend}
            disabled={sending}
            className="flex items-center gap-2 rounded-md bg-[#0b57d0] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0b4ec0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send"}
          </button>
          <button
            onClick={onDiscard}
            aria-label="Discard draft"
            disabled={sending}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            aria-label="Attach (coming soon)"
            disabled
            className="cursor-not-allowed rounded-full p-2 text-gray-300"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-500" role="status" aria-live="polite">
            {draftSaveStatus === "saving" ? "Saving…" : null}
            {draftSaveStatus === "saved" ? <><Save className="h-3.5 w-3.5" /> Saved</> : null}
            {draftSaveStatus === "unsaved" || draftSaveStatus === "idle" ? "Unsaved" : null}
            {draftSaveStatus === "error" ? "Save failed" : null}
          </span>
        </div>
      </div>
    </div>
  );
}

interface RecipientChipInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function RecipientChipInput({ value, onChange }: RecipientChipInputProps) {
  const [text, setText] = useState("");

  function commit() {
    const parts = text
      .split(/[,;]/)
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 0 && !value.includes(p));
    if (parts.length > 0) {
      onChange([...value, ...parts]);
    }
    setText("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded-full bg-[#eaf1fb] px-2 py-0.5 text-xs text-[#0b57d0]"
        >
          {email}
          <button
            onClick={() => onChange(value.filter((v) => v !== email))}
            aria-label={`Remove ${email}`}
            className="text-[#0b57d0]/70 hover:text-[#0b57d0]"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="email"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && text === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length === 0 ? "Recipients" : ""}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
