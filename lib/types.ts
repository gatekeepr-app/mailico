export type FolderKey = "inbox" | "starred" | "sent" | "department_sent" | "drafts" | "trash";

export interface Email {
  id: string;
  from: string;
  fromName?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  folder: FolderKey;
  starred: boolean;
  read: boolean;
  createdAt: number;
}

export interface ComposeState {
  open: boolean;
  draftId: string | null;
  fromName: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

export const EMPTY_COMPOSE: ComposeState = {
  open: false,
  draftId: null,
  fromName: "me",
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  body: "",
};
