"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, Search, Mail, RefreshCw, LogOut, UserRound } from "lucide-react";
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
  userCompanyEmail?: string | null;
  userEmployeeId?: string | null;
  userDepartment?: string | null;
  userRole?: string | null;
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
  userCompanyEmail,
  userEmployeeId,
  userDepartment,
  userRole,
  isStaff,
  onSignOut,
}: TopBarProps) {
  const avatarName = userName ?? userEmail;
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

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
        <span className="text-base font-semibold tracking-[-0.03em] text-[#24352e] md:text-lg">
          Mailico
        </span>
      </button>

      <div className="relative order-last w-full min-w-0 md:order-none md:mx-auto md:flex-1 md:max-w-[68rem]">
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
        className="hidden min-h-11 min-w-11 rounded-full p-2.5 text-[#52635b] hover:bg-[#f0f4f1] md:block"
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
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-label="Open profile menu"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-1 hover:bg-[#f0f4f1]"
          >
            <Avatar name={avatarName} size="md" />
          </button>
          {profileOpen && (
            <div role="dialog" aria-label="Profile and sign out" className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-[#dfe7e1] bg-white p-4 text-[#24352e] shadow-xl">
              <div className="flex items-center gap-3 border-b border-[#e8ede9] pb-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e4efe8] text-[#286653]"><UserRound className="size-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Profile</p>
                  <p className="truncate text-xs text-[#718078]">{userName || userEmail}</p>
                </div>
              </div>
              <dl className="space-y-2 py-3 text-xs">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-[#87948d]">Login email</dt><dd className="min-w-0 break-all">{userEmail}</dd></div>
                {userCompanyEmail && <div className="flex gap-2"><dt className="w-24 shrink-0 text-[#87948d]">Company email</dt><dd className="min-w-0 break-all">{userCompanyEmail}</dd></div>}
                {userEmployeeId && <div className="flex gap-2"><dt className="w-24 shrink-0 text-[#87948d]">Employee ID</dt><dd className="min-w-0 break-all">{userEmployeeId}</dd></div>}
                {userDepartment && <div className="flex gap-2"><dt className="w-24 shrink-0 text-[#87948d]">Department</dt><dd className="min-w-0 break-words">{userDepartment}</dd></div>}
                {userRole && <div className="flex gap-2"><dt className="w-24 shrink-0 text-[#87948d]">Role</dt><dd className="min-w-0 break-words">{userRole}</dd></div>}
              </dl>
              <button
                type="button"
                onClick={onSignOut}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-[#e3e9e4] px-3 text-left text-sm font-medium text-[#46564e] hover:bg-[#f5f8f5]"
              >
                <LogOut className="size-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </header>
  );
}
