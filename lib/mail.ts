import { type Email, type FolderKey } from "./types";

const STORAGE_KEY = "mailico.emails.v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildFromAddress(localPart: string, domain: string): string {
  if (!domain) return "";
  const clean = localPart.trim().replace(/@.*$/, "").toLowerCase();
  return `${clean}@${domain}`;
}

export function splitRecipients(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatAddresses(addresses: string[]): string {
  return addresses.join(", ");
}

export function formatMailboxName(email: string, name?: string): string {
  const cleanName = name?.trim();
  if (cleanName && cleanName.toLowerCase() !== email.toLowerCase()) return cleanName;
  const local = email.split("@")[0] || email;
  return local.replace(/[._-]+/g, " ");
}

export function formatMailboxAddress(email: string, name?: string): string {
  const cleanName = name?.trim();
  if (!cleanName || cleanName.toLowerCase() === email.toLowerCase()) return email;
  return `${cleanName} <${email}>`;
}

export function snippet(body: string, max = 160): string {
  const singleLine = body.replace(/\s+/g, " ").trim();
  return singleLine.length > max ? `${singleLine.slice(0, max)}…` : singleLine;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export interface EmailThread {
  key: string;
  messages: Email[];
  latest: Email;
}

function normalizedThreadSubject(subject: string) {
  return (subject || "(no subject)")
    .trim()
    .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function threadParticipants(email: Email) {
  return [...new Set([email.from, ...email.to, ...email.cc]
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean))].sort();
}

export function groupEmailsIntoThreads(emails: Email[]): EmailThread[] {
  const groups = new Map<string, Email[]>();

  for (const email of emails) {
    const key = email.folder === "drafts"
      ? `draft:${email.id}`
      : `${normalizedThreadSubject(email.subject)}\u0000${threadParticipants(email).join(",")}`;
    const messages = groups.get(key) ?? [];
    messages.push(email);
    groups.set(key, messages);
  }

  return [...groups.entries()]
    .map(([key, messages]) => {
      const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);
      return { key, messages: ordered, latest: ordered[ordered.length - 1] };
    })
    .sort((a, b) => b.latest.createdAt - a.latest.createdAt);
}

export function loadEmails(): Email[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Email[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEmails(emails: Email[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}

export function clearStorage(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function folderLabel(folder: FolderKey): string {
  switch (folder) {
    case "inbox":
      return "Inbox";
    case "starred":
      return "Starred";
    case "sent":
      return "Sent";
    case "drafts":
      return "Drafts";
    case "trash":
      return "Trash";
  }
}
