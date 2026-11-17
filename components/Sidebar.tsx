"use client";

import {
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  Pencil,
  X,
  Building2,
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
  canViewDepartmentSent?: boolean;
  departmentSentLabel?: string;
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
  canViewDepartmentSent = false,
  departmentSentLabel = "Department sent",
}: SidebarProps) {
  return (
    <aside className={`${mobileDrawer ? "w-[min(20rem,85vw)]" : "w-16 md:w-64 xl:w-[min(20vw,24rem)]"} shrink-0 border-r border-[#e3e9e4] bg-[#fbfcfa]`}>
      <div className="flex items-center justify-between p-3 md:px-4">
        <button
          onClick={onCompose}
          className={`${mobileDrawer ? "flex" : "hidden md:flex"} min-h-11 items-center gap-2 rounded-full bg-[#dcebe2] px-5 py-3 text-sm font-semibold text-[#245b49] shadow-sm transition hover:bg-[#cfe3d7]`}
        >
          <Pencil className="h-5 w-5" />
          Compose
        </button>
        <button
          onClick={onCompose}
          aria-label="Compose"
          className={`${mobileDrawer ? "hidden" : "md:hidden"} min-h-11 min-w-11 rounded-full bg-[#dcebe2] p-3 text-[#245b49] transition hover:bg-[#cfe3d7]`}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className={`${mobileDrawer ? "" : "md:hidden"} min-h-11 min-w-11 rounded-full p-2 text-[#718078] hover:bg-[#f0f4f1]`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-2 space-y-1 px-2 md:px-3">
        {[...NAV_ITEMS, ...(canViewDepartmentSent ? [{ key: "department_sent" as const, icon: Building2 }] : [])].map(({ key, icon: Icon }) => {
          const active = key === current;
          const count = counts[key];
          const label = key === "department_sent" ? departmentSentLabel : folderLabel(key);
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              title={label}
              className={`flex min-h-11 w-full items-center gap-4 rounded-r-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#e4efe8] text-[#245b49]"
                  : "text-[#46564e] hover:bg-[#f0f4f1]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={`${mobileDrawer ? "block" : "hidden md:block"} min-w-0 flex-1 truncate text-left`}>
                {label}
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
        <span className="font-medium text-[#52635b]">
          *@{mailDomain}
        </span>
      </div>
    </aside>
  );
}
