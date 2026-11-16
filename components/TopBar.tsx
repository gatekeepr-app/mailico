"use client";

import Link from "next/link";
import { Menu, Search, Mail, RefreshCw, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PushNotificationsControl, PwaInstallControl } from "@/components/PwaControls";

interface TopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenNav: () => void;
  onRefresh: () => void;
  onGoInbox: () => void;
  userEmail?: string | null;
  userName?: string | null;
  isStaff?: boolean;
  onSignOut?: () => void;
}

export default function TopBar({
  search,
  onSearchChange,
  onOpenNav,
  onRefresh,
  onGoInbox,
  userEmail,
  userName,
  isStaff,
  onSignOut,
}: TopBarProps) {
  const avatarName = userName ?? userEmail;

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b border-[#e3e9e4] bg-white px-2 py-2 md:h-16 md:flex-nowrap md:px-4 md:py-0">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="min-h-11 min-w-11 rounded-full p-2.5 text-[#52635b] hover:bg-[#f0f4f1] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onGoInbox}
        aria-label="Mailico home"
        className="flex items-center gap-2 px-1 md:px-2"
      >
        <Mail className="h-6 w-6 text-[#286653]" />
        <span className="hidden text-lg font-semibold tracking-[-0.03em] text-[#24352e] lg:block">
          Mailico
        </span>
      </button>

      <div className="relative order-last w-full min-w-0 md:order-none md:mx-auto md:flex-1 md:max-w-[56rem]">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search mail"
          className="w-full rounded-full border border-transparent bg-[#edf3ef] py-2.5 pl-11 pr-4 text-sm text-[#24352e] outline-none transition placeholder:text-[#718078] focus:border-[#9bb9aa] focus:bg-white focus:ring-2 focus:ring-[#286653]/10"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0 md:gap-2">
      <button
        onClick={onRefresh}
        aria-label="Refresh"
        className="min-h-11 min-w-11 rounded-full p-2.5 text-[#52635b] hover:bg-[#f0f4f1]"
      >
        <RefreshCw className="h-5 w-5" />
      </button>

      {userEmail && <PushNotificationsControl />}
      <PwaInstallControl />

      {isStaff && (
        <Link
          href="/admin"
          className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#52635b] hover:bg-[#f0f4f1] md:block"
        >
          Admin
        </Link>
      )}

      {userEmail && (
        <div className="flex items-center gap-2">
          <Avatar name={avatarName} size="md" className="hidden sm:flex" />
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            className="min-h-11 min-w-11 rounded-full p-2.5 text-[#52635b] hover:bg-[#f0f4f1]"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
      </div>
    </header>
  );
}
