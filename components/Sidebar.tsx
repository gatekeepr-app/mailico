"use client";

import {
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { folderLabel } from "@/lib/mail";
import type { FolderKey } from "@/lib/types";

interface SidebarProps {
  current: FolderKey;
  counts: Partial<Record<FolderKey, number>>;
  onNavigate: (folder: FolderKey) => void;
  onCompose: () => void;
  onClose: () => void;
  mailDomain: string;
  mobileDrawer?: boolean;
}

const NAV_ITEMS: { key: FolderKey; icon: typeof Inbox }[] = [
  { key: "inbox", icon: Inbox },
  { key: "starred", icon: Star },
  { key: "sent", icon: Send },
  { key: "drafts", icon: FileText },
  { key: "trash", icon: Trash2 },
];

export default function Sidebar({
  current,
  counts,
  onNavigate,
  onCompose,
  onClose,
  mailDomain,
  mobileDrawer = false,
}: SidebarProps) {
  return (
    <aside className={`${mobileDrawer ? "w-[min(20rem,85vw)]" : "w-16 md:w-64"} shrink-0 border-r border-gray-200 bg-white`}>
      <div className="flex items-center justify-between p-3 md:px-4">
        <button
          onClick={onCompose}
          className={`${mobileDrawer ? "flex" : "hidden md:flex"} min-h-11 items-center gap-2 rounded-full bg-[#c2e7ff] px-5 py-3 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-[#b1dffb]`}
        >
          <Pencil className="h-5 w-5" />
          Compose
        </button>
        <button
          onClick={onCompose}
          aria-label="Compose"
          className={`${mobileDrawer ? "hidden" : "md:hidden"} min-h-11 min-w-11 rounded-full bg-[#c2e7ff] p-3 text-gray-900 transition hover:bg-[#b1dffb]`}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className={`${mobileDrawer ? "" : "md:hidden"} min-h-11 min-w-11 rounded-full p-2 text-gray-500 hover:bg-gray-100`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-2 space-y-1 px-2 md:px-3">
        {NAV_ITEMS.map(({ key, icon: Icon }) => {
          const active = key === current;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex min-h-11 w-full items-center gap-4 rounded-r-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#d3e3fd] text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={`${mobileDrawer ? "block" : "hidden md:block"} flex-1 text-left`}>
                {folderLabel(key)}
              </span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={`${mobileDrawer ? "block" : "hidden md:block"} rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`${mobileDrawer ? "block" : "hidden md:block"} mt-8 break-all px-7 text-xs leading-relaxed text-gray-400`}>
        Sending from
        <br />
        <span className="font-medium text-gray-600">
          *@{mailDomain}
        </span>
      </div>
    </aside>
  );
}
