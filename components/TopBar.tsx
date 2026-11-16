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
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 md:px-4">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onGoInbox}
        aria-label="Mailico home"
        className="flex items-center gap-2 px-1 md:px-2"
      >
        <Mail className="h-6 w-6 text-[#0b57d0]" />
        <span className="hidden text-lg font-medium text-gray-800 lg:block">
          Mailico
        </span>
      </button>

      <div className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search mail"
          className="w-full rounded-full border border-transparent bg-[#eaf1fb] py-2.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0b57d0] focus:bg-white focus:shadow-sm"
        />
      </div>

      <button
        onClick={onRefresh}
        aria-label="Refresh"
        className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100"
      >
        <RefreshCw className="h-5 w-5" />
      </button>

      {userEmail && <PushNotificationsControl />}
      <PwaInstallControl />

      {isStaff && (
        <Link
          href="/admin"
          className="hidden rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 md:block"
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
            className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}
